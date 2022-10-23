
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


var instance = new Razorpay({
    key_id: 'rzp_test_6vEG39h3aWdPl9',
    key_secret: '0btas9V3TFb1btY4IuDw4xp6',
});

module.exports = {
    //====================Sign Up====================
    doSignup: (userData) => {
        userData.UserAddress = []
        return new Promise(async (resolve, reject) => {
            console.log(userData.Password);
            // let NewPassword=userData.Password.toString()
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then(() => {
                console.log('add done');
                //resolve(data)

                resolve(userData)
            })
        })
    },
    //====================Login ====================
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
    addToCart: ((proId, userId) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
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
            let status = order.paymentMethod === 'COD' ? 'placed' : 'pending'
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
            let order = db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(order)
        })
    },
    cancelOrder: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: objectId(proId) }).then((response) => {
                resolve()
            })
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
            console.log('users');
            console.log(orderId);
            console.log(users.user);
            console.log(users);
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
                resolve()
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
            console.log(Pass.newpassword);
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

    // helper functions 

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

    //=============================Delete saved address==========

    deleteAddress: (details) => {
        console.log('push');
        console.log(details.addressId);
        console.log( objectId(details.addressId));
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTIONS)
                .updateOne({ _id: objectId(details.addressId) },
                    {
                        $pull: { UserAddress: { no: details.addressno} }
                    }
                ).then((response) => {
                    resolve({ removeAddress: true })
            })
        })
    }   
}

