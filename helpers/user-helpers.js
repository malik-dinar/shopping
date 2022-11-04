
var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('../app')
var objectId = require('mongodb').ObjectId
var moment = require('moment');
var { uid } = require('uid')
const Razorpay = require('razorpay');
const { resolve } = require('node:path')

//paypal
var paypal = require('paypal-rest-sdk');
const { Transaction, Collection } = require('mongodb')


var instance = new Razorpay({
    key_id: 'rzp_test_6vEG39h3aWdPl9',
    key_secret: '0btas9V3TFb1btY4IuDw4xp6',
});

module.exports = {
    //====================Sign Up =====================
    doSignup: (userData) => {
        userData.UserAddress = []
        let refFailed = {}
        return new Promise(async (resolve, reject) => {
            let refId = userData.number
            let ref = userData.referl
            let response = {}
            // let NewPassword=userData.Password.toString()
            let userEmail = await db.get().collection(collection.USER_COLLECTIONS).findOne({ email: userData.email })
            let userMobile = await db.get().collection(collection.USER_COLLECTIONS).findOne({ number: userData.number })
            let refClaimed
            if (userData.referl) {
                refClaimed = await db.get().collection(collection.USER_COLLECTIONS).findOne({ number: ref })
            } else {
                refClaimed = true
            }
            console.log(refClaimed);
            if (userEmail) {
                userEmail.emailcheck = true;
                resolve(userEmail)
            } else if (userMobile) {
                userMobile.numcheck = true;
                resolve(userMobile)
            } else if (refClaimed == null) {
                refFailed.refcheck = true
                resolve(refFailed)
            } else {
                userData.password = await bcrypt.hash(userData.password, 10)
                await db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then(async (userDetails) => {
                    wall = userDetails.insertedId
                    db.get().collection(collection.WALLET_COLLECTION).insertOne({
                        user: userDetails.insertedId,
                        amount: 0,
                        referelId: refId,
                        transactions: []
                    })


                    response.user = userData
                    resolve(response)
                })
            }
        })
    },
    //====================Login =====================
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ email: userData.email })

            if (user) {
                console.log(user.password);

                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log('loginsucces');
                        response.userData = user
                        response.status = true
                        resolve(response)
                    }
                    else {
                        console.log('login failed');
                        resolve({ status: false })
                    }
                })
            }
            else {
                console.log('failed');
                resolve({ status: false })
            }
        })
    },
    //====================Block unblock user====================
    blockUser: (userId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, { $set: { "isBlocked": true } })
            resolve()
        })
    },
    UnblockUser: (userId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, { $set: { "isBlocked": false } })
            resolve()
        })
    },
    isBlocked: ((userId) => {
        return new Promise(async (resolve, reject) => {
            let Blocked = await db.get().collection(collection.USER_COLLECTIONS).findOne({ $and: [{ _id: objectId(userId) }, { isBlocked: true }] })

            if (Blocked) {
                let error = "user is blocked"
                reject(error)
                console.log('blocked');
            }
            else {
                resolve()
            }
        })
    }),
    //====================Product view page==================== 
    getProductDetailforuser: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    //====================Otp checking user====================
    checkUser: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ number: userData.number })
            if (user) {
                console.log(`user is ${user}`);
                response.user = user
                resolve(response)
            } else {
                console.log("user not found");
                resolve(response)
            }
        })
    },
    //====================Add to Cart====================
    addToCart: (async (proId, userId) => {
        let proName = await db.get().collection(collection.PRODUCT_COLLECTION).find({ _id: objectId(proId) }).toArray()
        console.log('proName.name');
        console.log(proName);
        console.log(proName[0].name);
        let proObj = {
            item: objectId(proId),
            quantity: 1,
            name: proName[0].name
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log('proExist');
                console.log(proExist);
                console.log(proObj);
                if (proExist != -1) {
                    console.log('look');
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }
                        ).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })

                }

            } else {
                console.log('heloo');
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve(response)
                })
            }
        })
    }),
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }  //user
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            // console.log(cartItems[0].products);
            if (cartItems.length === 0) {
                resolve()
            } else {
                resolve(cartItems)
            }

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })
            }

        })
    },
    removeProductFromCart: (remove) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION)
                .updateOne({ _id: objectId(remove.cart) },
                    {
                        $pull: { products: { item: objectId(remove.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }  //user
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            console.log('total');
            if (total.length === 0) {
                resolve()
            } else {
                resolve(total[0].total)
            }

            //  resolve(total)
        })
    },
    getAmountOne: (userId) => {
        return new Promise(async (resolve, reject) => {
            let totalOne = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectId(userId) }  //user
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        totalOne: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }
            ]).toArray()
            console.log('price of one product');
            // console.log(totalOne[0].totalOne);
            resolve(totalOne)

        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            if (cart) {
                resolve(cart.products)
            } else {
                resolve()
            }
        })
    },
    //====================Place Order====================
    placeOrder: (order, products, total, userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(order, products, total);
            console.log(order.address);
            console.log('111');
            addressid = order.addressRadio
            console.log(addressid);
            console.log(userId);
            let oneAddress = await db.get().collection(collection.USER_COLLECTIONS)
                .aggregate([
                    {
                        $match: { _id: objectId(userId) }
                    },
                    {
                        $unwind: '$UserAddress'
                    },
                    {
                        $project: {
                            no: '$UserAddress.no',
                            name: '$UserAddress.name',
                            mobile: '$UserAddress.number',
                            email: '$UserAddress.email',
                            address: '$UserAddress.address',
                            state: '$UserAddress.state',
                            pincode: '$UserAddress.pincode'
                        }
                    },
                    {
                        $match: { no: addressid }
                    }
                ]).toArray()
            console.log(oneAddress);
            let status = order.paymentMethod === 'COD' ? 'placed' : 'placed'
            let orderObj = {
                deliveryDetails: {
                    name: oneAddress[0].name,
                    mobile: oneAddress[0].mobile,
                    email: oneAddress[0].email,
                    address: oneAddress[0].address,
                    state: oneAddress[0].state,
                    pincode: oneAddress[0].pincode
                },
                userId: objectId(userId),
                PaymentMethod: order.paymentMethod,
                products: products,
                totalAmount: total,
                status: status,
                date: moment().format('Do MMMM YY, hh:mm')
            }

            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(userId) })
                resolve(response.insertedId)
            })
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: objectId(userId) }).toArray()
            resolve(orders)
        })
    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()

            console.log(cartItems.length);
            console.log(cartItems);
            // console.log(cartItems[0].products);
            if (cartItems.length === 0) {
                resolve()
            } else {
                console.log(cartItems);
                resolve(cartItems)
            }

        })
    },
    getOrders: () => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            console.log(order)
            resolve(order.reverse())
        })
    },
    cancelOrder: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                resolve()
            })
        })
    },
    orderStatus: (orderId) => {
        console.log(orderId);
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            resolve(order)
        })
    },
    //    cancelOrderAdmin:(proId)=>{
    //     return new Promise((resolve,reject)=>{
    //         db.get().collection(collection.ORDER_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
    //               resolve()
    //            })
    //        })
    //    },
    getOrderUser: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTIONS,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'users'
                    }
                },
                {
                    $project: {
                        users: { $arrayElemAt: ['$users', 0] }
                    }
                }
            ]).toArray()

            // console.log(users.length);
            resolve(users)
        })
    },
    //====================user profile====================
    getUserProfile: (userId) => {
        return new Promise((resolve, reject) => {
            console.log(userId);
            db.get().collection(collection.USER_COLLECTIONS).findOne({ _id: objectId(userId) }).then((user) => {
                console.log(user);
                resolve(user)
            })
        })
    },
    //====================update user profile====================
    updateProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {

            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, {

                $set: {
                    name: userDetails.name,
                    number: userDetails.number,
                    address: userDetails.address,
                    pincode: userDetails.pincode,
                    state: userDetails.state,
                    email: userDetails.email
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },

    //====================Add Address =======================

    AddAddress: async (userId, userDetails) => {
        let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ _id: objectId(userId) })
        console.log(user);
        let uniqueId = uid();
        // let AddressId=user.UserAddress.length
        // console.log(user.UserAddress.length);
        return new Promise((resolve, reject) => {
            let AddressObj = {
                name: userDetails.name,
                number: userDetails.number,
                no: uniqueId,
                address: userDetails.address,
                pincode: userDetails.pincode,
                state: userDetails.state,
                email: userDetails.email
            }
            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, {
                $push: {
                    UserAddress: AddressObj
                }
            }).then((response) => {
                resolve()
            })
        })

    },
    //====================change user password====================
    changePassword: (Pass, userId) => {
        console.log(userId);
        return new Promise(async (resolve, reject) => {
            let response = {}
            let userrr = await db.get().collection(collection.USER_COLLECTIONS).findOne({ _id: objectId(userId) })
            Pass.newpassword = await bcrypt.hash(Pass.newpassword, 10)
            bcrypt.compare(Pass.oldpassword, userrr.password).then(async (stat) => {
                console.log('true');
                if (stat) {
                    await db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, {
                        $set: {
                            password: Pass.newpassword
                        }
                    })
                    console.log('sure');

                    response.statuss = true
                    resolve(response)
                } else {
                    console.log('wrong');
                    resolve({ statuss: false })
                }
            })
        })
    },

    getAllAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            let address = await db.get().collection(collection.USER_COLLECTIONS).aggregate([
                {
                    $match: { _id: objectId(userId) }
                },
                {
                    $unwind: '$UserAddress'
                },
                {
                    $project: {
                        // _id:0,address:'$UserAddress'
                        no: '$UserAddress.no',
                        name: '$UserAddress.name',
                        address: '$UserAddress.address',
                        pincode: '$UserAddress.pincode',
                        state: '$UserAddress.state',
                        email: '$UserAddress.email',
                        number: '$UserAddress.number'
                    }
                }
            ]).toArray()
            // console.log(cartItems[0].products);

            console.log(address);
            if (address.length === 0) {
                resolve()
            } else {
                resolve(address)
            }
        })
    },
    generateRazorpay: (orderId, total) => {
        return new Promise(async (resolve, reject) => {
            let order = await instance.orders.create({
                amount: total * 100,
                currency: "INR",
                receipt: "" + orderId,
                notes: {
                    key1: "value3",
                    key2: "value2"
                }
            })
            console.log('///////');
            console.log(order);
            resolve(order)
        })
    },
    verifyPayment: (details) => {
        return new Promise(async (resolve, reject) => {
            const { createHmac } = await import('node:crypto');
            let hmac = createHmac('sha256', '0btas9V3TFb1btY4IuDw4xp6');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }

        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }).then(() => {
                        resolve()
                    })
        })
    },

    //====================helper functions paypal============= 

    createPay: (payment) => {
        return new Promise((resolve, reject) => {
            paypal.payment.create(payment, function (err, payment) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(payment);
                }
            });
        });
    },

    //=============================Delete saved address===============

    deleteAddress: (details) => {
        console.log('push');
        console.log(details.addressId);
        console.log(objectId(details.addressId));
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTIONS)
                .updateOne({ _id: objectId(details.addressId) },
                    {
                        $pull: { UserAddress: { no: details.addressno } }
                    }
                ).then((response) => {
                    resolve({ removeAddress: true })
                })
        })
    },

    //===========================Total Sale Occurred==================//

    TotalSale: () => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { 'status': { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: null,
                        totalSale: { $sum: '$totalAmount' }
                    }
                }
            ]).toArray()
            console.log('to sale');
            console.log(total[0]);
            resolve(total[0])
        })
    },


    //===========================Total number of users==================//

    totalUsers: () => {
        return new Promise(async (resolve, reject) => {
            let totalUsers = await db.get().collection(collection.USER_COLLECTIONS).count()
            resolve(totalUsers)
        })
    },
    //===========================Total number of users==================//

    totalOrders: () => {
        return new Promise(async (resolve, reject) => {
            let totalOrders = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(totalOrders)
        })
    },

    //===========================GET ALL DATE==================//
    allDate: () => {
        return new Promise(async (resolve, reject) => {
            let allDate = await db.get().collection(collection.ORDER_COLLECTION)
                .aggregate([
                    {
                        $group: {
                            _id: null, day: { $addToSet: "$date" }
                        },
                    },
                ]).toArray()
            console.log('alllllllllllllllllllll');
            console.log(allDate);

            // let array = allDate[0].day
            // let newdays=[]

            // array.forEach(element =>

            //     newdays.push(element.slice(0,-7))
            // );
            //     console.log(newdays)
        })
    },

    //===========================GET STATUS ACCORDING TO MONTH=====================//

    stausHistory: () => {
        let statuses = {}
        return new Promise(async (resolve, reject) => {
            let placed = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: 'placed'
                    },
                },
                {
                    $group: { _id: { month1: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                },
                {
                    $sort: { "_id.month1": -1 }
                }
            ]).toArray()
            statuses.placedNo = placed[0].count

            let delivered = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: 'out of delivered'
                    },
                },
                {
                    $group: { _id: { month2: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }
            ]).toArray()
            statuses.deliveredNo = delivered[0].count

            let shipped = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: 'shipped'
                    },
                },
                {
                    $group: { _id: { month3: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }
            ]).toArray()
            statuses.shippedNo = shipped[0].count


            let cancelled = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: 'cancelled'
                    }
                },
                {
                    $group: { _id: { month4: { $month: { $toDate: "$date" } } }, count: { $sum: 1 } }
                }
            ]).toArray()
            statuses.cancelledNo = cancelled[0].count
            console.log(statuses);
            resolve(statuses)
        })
    },
    getOrders2: () => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).find().sort({ "date": -1 }).limit(5).toArray()
            console.log('lew');
            console.log(order);
            resolve(order)
        })
    },
    monthlySale: () => {
        return new Promise(async (resolve, reject) => {
            let monthSale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { 'status': { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: { month: { $month: { $toDate: "$date" } } }, totalSale: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.month": -1 }
                },
                {
                    $project: {
                        _id: 0,
                        totalSale: 1
                    }
                }
            ]).toArray()
            let month = monthSale[0].totalSale
            console.log(month);
            resolve(month)
        })
    },
    getMonths: () => {
        return new Promise(async (resolve, reject) => {
            // let yearsForCheck=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            //     {
            //         $group:{
            //             _id: {year:{ $year :{ $toDate: "$date" }}}
            //         }
            //     },
            //     {
            //         $sort:{"_id.year": -1}
            //     },
            //     {
            //         $limit:1
            //     },
            //     {
            //         $project:{
            //             _id:0,year:'$_id.year',
            //         }
            //     }
            // ]).toArray()
            // let check=yearsForCheck[0].year
            // console.log(check)
            // console.log(yearsForCheck);
            let months = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { 'status': { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: { month: { $month: { $toDate: "$date" } } }, totalSale: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.month": -1 }
                },
                {
                    $limit: 6
                },
                //orginal
                {
                    $project: {
                        _id: 0, month: '$_id.month',
                        totalSale: 1,
                    }
                }

                //testing
                // {
                //     $project:{
                //         _id:0,month:'$_id.month',               
                //         totalSale:1,
                //         qtyEq250: { $eq: [ {year:{ $year :{ $toDate: "$date" }}}, check ] },
                //         hi:1
                //     }
                //}      
            ]).toArray()
            console.log(months);
            months.forEach(element => {
                // monNumArray.push(element.month)
                //element.month="hai"

                function toMonthName(months) {
                    const date = new Date();
                    date.setMonth(months - 1);

                    return date.toLocaleString('en-US', {
                        month: 'long',
                    });
                }
                element.month = toMonthName(element.month)
            });
            console.log('m');
            console.log(months);
            resolve(months)
        })
    },
    getYears: () => {
        return new Promise(async (resolve, reject) => {
            let years = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { 'status': { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: { year: { $year: { $toDate: "$date" } } }, totalSaleYear: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.year": -1 }
                },
                {
                    $limit: 6
                },
                {
                    $project: {
                        _id: 0, year: '$_id.year',
                        totalSaleYear: 1,
                    }
                }
            ]).toArray()
            console.log('years');
            console.log(years);
            resolve(years)
        })
    },
    getDays: () => {
        return new Promise(async (resolve, reject) => {
            let days = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { 'status': { $nin: ['cancelled'] } }
                },
                {
                    $group: {
                        _id: { day: { $dayOfMonth: { $toDate: "$date" } } }, totalSaleDay: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { "_id.day": 1 }
                },
                {
                    $limit: 5
                },
                {
                    $project: {
                        _id: 0, day: '$_id.day',
                        totalSaleDay: 1,
                    }
                }
            ]).toArray()
            console.log('days');
            console.log(days);
            resolve(days)
        })
    },



    updateAddress: (userId, userDetails) => {
        console.log('don ');
        console.log(userId);
        console.log(userDetails);
        return new Promise((resolve, reject) => {

            db.get().collection(collection.USER_COLLECTIONS)

        })
    },

    getWallet: (userId) => {
        console.log(userId);
        return new Promise(async (resolve, reject) => {
            let wallet = await db.get().collection(collection.WALLET_COLLECTION).findOne({ user: objectId(userId) })
            if (wallet.length === 0) {
                resolve()
            } else {
                resolve(wallet)
            }
        })
    },

    refered300: (walletid) => {
        console.log('this');
        console.log(walletid);
        return new Promise((resolve, reject) => {
            let date = new Date().toLocaleString('en-US')
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ referelId: walletid },
                {
                    $inc: { amount: 300 },
                    $push: {
                        transactions: {
                            transactiondescription: 'referel claimed',
                            transactionAmount: 300,
                            type: 'Credited',
                            transactionDate: date
                        }
                    }
                })
        })
    },

    refered150: (userId) => {
       return new Promise((resolve,reject)=>{
        let date = new Date().toLocaleString('en-US')
        db.get().collection(collection.WALLET_COLLECTION).updateOne({ user: userId },
            {
                $inc: { amount: 150 },
                $push: {
                    transactions: {
                        transactiondescription: 'referel claimed',
                        transactionAmount: 150,
                        type: 'Credited',
                        transactionDate: date
                    }
                }
            })
       })
    },

    useWallet: (userId, totalPrice) => {
        console.log(totalPrice);
        console.log(userId);
        return new Promise((resolve,reject)=>{
            let date = new Date().toLocaleString('en-US')
            db.get().collection(collection.WALLET_COLLECTION).updateOne({ user: objectId(userId) }, {
                $inc: { amount: -totalPrice },
                $push: {
                    transactions: {
                        transactiondescription: 'product Ordered',
                        transactionAmount: totalPrice,
                        type: 'debited',
                        transactionDate: date
                    }
                }
            })
        })
    },


    Promocode: (totalAndCode) => {
        let response={}
        return new Promise(async(resolve,reject)=>{
            let CouponCheck=await db.get().collection(collection.OFFER_COLLECTION).findOne({coupon:totalAndCode.promo})
            let check={}
            if(CouponCheck){
                if(CouponCheck.minimum < totalAndCode.total){
                    let price=parseInt((totalAndCode.total/100)*CouponCheck.offerpercent)
                    let offerPrice=totalAndCode.total-price
                    response.discprice=offerPrice;
                    response.price=price;
                    response.coupon=CouponCheck.coupon
                    resolve(response)
                }
                else{
                    console.log('2');
                    check.couponErr=true;
                    resolve(check)
                }
            }else{
                check.couponErr=true;
                resolve(check)
            }
        })
    },


    PromocodePlace:async(couponName,total)=>{
        return new Promise(async(resolve,reject)=>{
            let CouponCheck=await db.get().collection(collection.OFFER_COLLECTION).findOne({coupon:couponName})
            let price=parseInt((total/100)*CouponCheck.offerpercent)
                resolve(price)
        })
    },


}

