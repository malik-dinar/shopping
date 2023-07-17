const e = require('express');
var express = require('express');
var router = express.Router();
var session = require('express-session');
const { Db } = require('mongodb');
const { response, use } = require('../app');
const productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const paypal = require('paypal-rest-sdk');
const { route } = require('./admin');
const flash = require('connect-flash');
const Handlebars = require('handlebars');
require('dotenv').config()



paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': process.env.PAYPAL_SANDBOX_CLIENT_ID,
  'client_secret': process.env.PAYPAL_SANDBOX_CLIENT_SECRET
});

//Custome Middleware to check if user is logged in
const verifyUserLogin = (req, res, next) => {
  if (req.session.user) {
    next()
  }
  else {
    //res.redirect('/')
    res.redirect('/login-page')

  }
}

/* GET Landing Page For Guest Users page. */
router.get('/', function (req, res, next) {
  res.render('cover', { title: 'Express' });
});


//Get Homepage For Guest and Users 
router.get('/home', async function (req, res) {
  try {
    const perPage = 12;
    let pageNum;
    let skip;
    let productCount;
    let pages;
    pageNum = parseInt(req.query.page);
    console.log(typeof (pageNum))
    skip = (pageNum - 1) * perPage
    await productHelpers.getProductCount().then((count) => {
      productCount = count;
    })
    pages = Math.ceil(productCount / perPage)

    Handlebars.registerHelper('ifCond', function (v1, v2, options) {
      if (v1 === v2) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
    Handlebars.registerHelper('for', function (from, to, incr, block) {
      var accum = '';
      for (var i = from; i <= to; i += incr)
        accum += block.fn(i);
      return accum;
    });

    let search = '';
    if (req.query.search) {
      search = req.query.search

      productHelpers.getCategory().then((datacategory) => {
        productHelpers.getSearchProducts(search).then(async (products) => {
          if (req.session.user) {
            cartCount = await userHelpers.getCartCount(req.session.user._id)
            let user = req.session.user
            res.render('user/home-page', { products, admin: false, user, datacategory, cartCount });
          } else {
            res.render('user/home-page', { products, admin: false, datacategory });
          }
        })
      })
    } else {
      productHelpers.getBanner().then((banner) => {
        productHelpers.getCategory().then((datacategory) => {
          // let user=req.session.user
          productHelpers.getPaginatedProducts(skip, perPage).then(async (products) => {
            // productHelpers.getDiscountPercent().then(async(discountPercent)=>{
            let cartCount = null;
            if (req.session.user) {
              console.log(products.length);
              userHelpers.getWishlistProducts(req.session.user._id).then(async(data) => {
                console.log(data);
                console.log(data.length);
                for (let i = 0; i < products.length; i++) {
                    for (let j = 0; j < data.length; j++) {
                        if (products[i]._id.toString() == data[j].item.toString()) {
                            products[i].isWishlisted = true;  
                      }
                    }
                }
                console.log(products);
                cartCount = await userHelpers.getCartCount(req.session.user._id)
                let user = req.session.user
                res.render('user/home-page', { products, admin: false, user, datacategory, cartCount, totalDoc: productCount, currentPage: pageNum, pages: pages, banner }); 
              }).catch((err)=>{
                console.log(err);
              })     
            } else {
              res.render('user/home-page', { products, admin: false, datacategory, totalDoc: productCount, currentPage: pageNum, pages: pages, banner });
            }
            //  })
          })
        })
      })
    }
  } catch (err) {
    console.log(err + "error happened in home page");
    res.redirect('/error')
  }
});

//Get login Page
router.get('/login-page', function (req, res) {
  try {
    res.render('user/login-page', { log: true });
  } catch (err) {
    console.log(err + "error happened in login page");
    res.redirect('/error')
  }
});

router.get('/sign', (req, res) => {
  try {
    res.render('user/signup-page', { log: true, Err: req.session.emailErr, Err1: req.session.numErr, Err2: req.session.refErr, redErr: req.session.redErr })
    req.session.emailErr = null;
    req.session.numErr = null;
    req.session.refErr = null;
    req.session.redErr = null;
  }
  catch (err) {
    console.log(err + "error happened sign up page");
    res.redirect('/error')
  }
});


//POST 
router.post('/signup', (req, res) => {
  try {
    refered = req.body.referl
    userHelpers.doSignup(req.body).then((response) => {
      if (response.emailcheck) {
        req.session.emailErr = 'Email Already Exist'
        res.redirect('/sign')
      }
      else if (response.numcheck) {
        req.session.numErr = 'phone number already Exist'
        res.redirect('/sign')
      } else if (response.refcheck) {
        req.session.refErr = 'referal id doesnt exists'
        res.redirect('/sign')
      }
      else if (response.mismatch) {
        req.session.redErr = 'password Mismatched'
        res.redirect('/sign')
      } else {
        //req.session.user=response.user
        // req.session.user = response
        // console.log(req.session.user._id);
        //req.session.user = true
        req.session.user = response.user
        if (refered) {
          userHelpers.refered300(refered)
          userHelpers.refered150(req.session.user._id)
        }
        //  req.session.user=true
        // req.session.user = response
        // let user=req.session.user
        res.redirect('/home')
      }
    })
  } catch (err) {
    console.log(err + "error happened in signup");
    res.redirect('/error')
  }
});


router.get('/login', function (req, res, next) {
  try {
    if (req.session.user) {
      res.redirect('/home')
    }
    else {

      res.render('user/login-page', { logginErr: req.session.loginErr, log: true });
      req.session.loginErr = null;
    }
  } catch (err) {
    console.log(err + "error happened in login");
    res.redirect('/error')
  }
  //res.render('user/login-page',{log:true});
});


router.post('/login', (req, res, next) => {
  try {
    userHelpers.doLogin(req.body).then((response) => {
      if (response.status) {
        userHelpers.isBlocked(response.userData._id).then(() => {
          if (response.status) {
            req.session.user = true
            req.session.user = response.userData
            res.redirect('/home')
          }
        }).catch((error) => {
          req.session.loginErr = "the user is blocked"
          res.redirect('/login')
        })
      }
      else {
        console.log('pass');
        req.session.loginErr = "Enter valid password"
        res.redirect('/login')
      }
    })
  } catch (err) {
    console.log(err + "error happened in login post");
    res.redirect('/error')
  }
});



router.get('/logout', (req, res) => {
  try {
    req.session.user = null;
    res.redirect('/home')
  } catch (err) {
    console.log(err + "error happened while logout");
    res.redirect('/error')
  }
});




router.get('/loginn', (req, res) => {
  res.redirect('/login')
})

/////
/////
router.get('/user-block', (req, res) => {
  try {
    userHelpers.UnblockUser().then(() => {
      res.redirect('admin/user-management')
    })
  } catch (err) {
    console.log(err + "error happened in user block");
    res.redirect('/error')
  }
})

router.get('/product-view/:id', async (req, res) => {
  try {
    if (req.session.user) {
      let user = req.session.user
      let product = await userHelpers.getProductDetailforuser(req.params.id)
      res.render('user/product-view', { admin: false, product, user })
    } else {
      await userHelpers.getProductDetailforuser(req.params.id).then((product) => {
        res.render('user/product-view', { admin: false, product });
      }).catch((err) => {
        console.log(err + "error happened in product view");
        res.redirect('/error')
      })
      // productHelpers.getCategoryname(req.params.id).then((allcat)=>{
      // })
    }
  } catch (err) {
    console.log(err + "error happened in product view");
    res.redirect('/error')
  }
})


router.get('/category/:cat', (req, res) => {
  try {
    productHelpers.getCategory().then((datacategory) => {
      if (req.session.user) {
        productHelpers.getProductsInCategory(req.params.cat).then((products) => {
          console.log(products);
          res.render('user/home-page2', { products, datacategory ,user: req.session.user })
        })
      } else {
        productHelpers.getProductsInCategory(req.params.cat).then((products) => {
          res.render('user/home-page2', { products, datacategory ,user: req.session.user})
        })
      }
    })
  } catch (err) {
    console.log(err + "error happened in get category");
    res.redirect('/error')
  }
})

// router.post('/cart',(req,res)=>{
//   console.log('hiiiiiiii');
//   // res.redirect('/cart')
// })

router.get('/cart', verifyUserLogin, async (req, res) => {
  try {
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    let totalOne = await userHelpers.getAmountOne(req.session.user._id)
    let products = await userHelpers.getCartProducts(req.session.user._id)
    console.log(products);
    // res.render('user/cart',{products,user})
    if (products) {
      res.render('user/cart', { products, user: req.session.user, total, totalOne })
    } else {
      res.render('user/cart', { user: req.session.user })
    }
  } catch (err) {
    console.log(err + "error happened in cart page");
    res.redirect('/error')
  }
})

router.get('/add-to-cart/:id', verifyUserLogin, async (req, res) => {
  try {
    console.log('djashf;kjaskd');
    console.log(req.params.id);
    if (req.session.user) {
      userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
        console.log(req.params.id);
        res.redirect('/cart',)
      })
    }
    else {
      res.redirect('/login-page')
    }
  } catch (err) {
    console.log(err + "error happened in add to cart get");
    res.redirect('/error')
  }
})

router.get('/wishlist', verifyUserLogin, async (req,res)=>{
  await userHelpers.getWishlistProducts(req.session.user._id).then((products)=>{
    res.render('user/wishlist',{products , user: req.session.user})
  })
})

router.get('/add-to-wishlist/:id', verifyUserLogin, (req, res) => {
  try {
    if (req.session.user) {
      console.log(req.params.id);
      console.log( req.session.user._id);
      userHelpers.addToWhislist(req.params.id, req.session.user._id).then(() => {
        res.redirect('/home')
      })
    }
    else {
      res.redirect('/login-page')
    }
  } catch (err) {
    console.log(err + "error happened in add to wishlist get");
    res.redirect('/error')
  }
})

router.post('/change-product-quantity', verifyUserLogin, async (req, res) => {
  try {
    let availableQty;
    await productHelpers.getProductStock(req.body).then((stock) => {
      console.log(stock, 'qty,', req.body.quantity)
      availableQty = stock;
    })
    if (parseInt(req.body.quantity) < parseInt(availableQty)) {
      userHelpers.changeProductQuantity(req.body).then(async (response) => {
        response.total = await userHelpers.getTotalAmount(req.body.user)
        //response.total=await userHelpers.getTotalAmount(req.body.user._id)
        res.json(response)
      })
    } else {
      if (req.body.count == -1) {
        userHelpers.changeProductQuantity(req.body).then(async (response) => {
          response.total = await userHelpers.getTotalAmount(req.body.user)
          //response.total=await userHelpers.getTotalAmount(req.body.user._id)
          res.json(response)
        })
      } else {
        let responseObj = {}
        responseObj.availableQty = availableQty
        responseObj.status = false
        res.json(responseObj)
      }
    }
  } catch (err) {
    console.log(err + "error happened in change quanitity");
    res.redirect('/error')
  }
})

router.post('/remove-product', verifyUserLogin, (req, res) => {
  try {
    userHelpers.removeProductFromCart(req.body).then((response) => {
      res.json(response)
    }).catch((err) => {
      console.log(err + "error happened in remove product");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in remove product");
    res.redirect('/error')
  }
})

router.post('/remove-product-wishlist', verifyUserLogin, (req, res) => {
  try {
    userHelpers.removeProductFromWishlist(req.body).then((response) => {
      res.json(response)
    }).catch((err) => {
      console.log(err + "error happened in remove product");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in remove product");
    res.redirect('/error')
  }
})

router.get('/place-order', verifyUserLogin, async (req, res) => {
  try {
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    let products = await userHelpers.getCartProducts(req.session.user._id)
    let totalOne = await userHelpers.getAmountOne(req.session.user._id)
    let address = await userHelpers.getAllAddress(req.session.user._id)
    let wallet = await userHelpers.getWallet(req.session.user._id)
    let codes = await productHelpers.getCouponCode()
    console.log(codes);
    console.log(wallet.amount);
    if (wallet.amount > total) {
      walletView = true
    }
    else {
      walletView = false
    }
    res.render('user/place-order', { user: req.session.user, total, products, totalOne, address, wallet, walletView, Err: req.session.CouponErr, codes });
    req.session.CouponErr = null
  } catch (err) {
    console.log(err + "error happened in place order view");
    res.redirect('/error')
  }
})

router.get('/continue-shopping', verifyUserLogin, (req, res) => {
  res.redirect('/home')
})

router.get('/order-placed', verifyUserLogin, (req, res) => {
  res.render('user/order-placed', { user: req.session.user });
})

router.post('/place-order', verifyUserLogin, async (req, res) => {
  try {
    let userId = req.session.user._id
    let totalPrice = 0
    let products = await userHelpers.getCartProductList(userId)
    totalPrice = await userHelpers.getTotalAmount(userId)
    if (req.body.couponName) {
      totalPrice = await userHelpers.getTotalAmount(userId)
      let discountAmount = await userHelpers.PromocodePlace(req.body.couponName, totalPrice)
      totalPrice = totalPrice - discountAmount
    } else {
      totalPrice = await userHelpers.getTotalAmount(userId)
    }
    userHelpers.placeOrder(req.body, products, totalPrice, userId).then(async (orderId) => {
      // res.redirect('/order-placed');
      if (req.body['paymentMethod'] == 'COD') {
        res.json({ codSuccess: true })
      }
      else if (req.body['paymentMethod'] == 'Razorpay') {
        await userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          response.razor = true
          res.json(response)
        })
      }
      else if (req.body.paymentMethod == 'Paypal') {
        var payment = {
          "intent": "authorize",
          "payer": {
            "payment_method": "paypal"
          },
          "redirect_urls": {
            "return_url": "https://d-dress.tk/order-placed",
            "cancel_url": "https://d-dress.tk/place-order"
          },
          "transactions": [{
            "amount": {
              "currency": "USD",
              "total": totalPrice
            },
            "description": ""
          }]
        }
        // call the create Pay method 
        userHelpers.createPay(payment)
          .then((transaction) => {
            var id = transaction.id;
            var links = transaction.links;
            var counter = links.length;
            while (counter--) {
              if (links[counter].rel === 'approval_url') {     //  if ( links[counter].method == 'REDIRECT') {  
                // redirect to paypal where user approves the transaction 
                // res.json({paypalsuccess:true})  ///i added
                console.log(links[counter].href);
                // return res.redirect( links[counter].href ) 
                transaction.pay = true
                transaction.linkto = links[counter].href
                transaction.orderId = orderId
                console.log(payment)
                userHelpers.changePaymentStatus(orderId).then(() => {
                  res.json(transaction)
                })
              }
            }
          })
          .catch((err) => {
            console.log(err);
            res.send('Error');
            // res.redirect('/place-order');
          });
      } else if (req.body['paymentMethod'] == 'Wallet') {
        userHelpers.useWallet(userId, totalPrice)
        res.json({ codSuccess: true })
      } else {
        res.send('Error');
      }
    })
  } catch (err) {
    console.log(err + "error happened in place order");
    res.redirect('/error')
  }
})





// Get Otp login Page
router.get('/otp-page', (req, res) => {
  try {
    res.render('user/otp-page', { otpSended: req.session.otpSended, otp: req.session.otpSend, noaccount: req.session.noaccount, otpErr: req.session.otpErr })
    req.session.otpSended = false;
    req.session.noaccount = false;
    req.session.otpErr = false;
  } catch (err) {
    console.log(err + "error happened in otp page");
    res.redirect('/error')
  }
})

//POST Send Otp To Twilio 
router.post('/sendotp', (req, res) => {
  try {
    userHelpers.checkUser(req.body).then((response) => {
      if (response.user) {
        let ph_no = (`+91${req.body.number}`)
        req.session.number = ph_no;
        client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
          .verifications
          .create({ to: ph_no, channel: 'sms' })
          .then(verification => {
            console.log(verification.status)
            //  req.session.preuser=response.user
            req.session.user = response.user
            req.session.otpSended = true;
            req.session.otpSend = true;
            res.redirect('/otp-page')
          })
      } else {
        console.log('number is not in db');
        req.session.noaccount = true;
        res.redirect('/otp-page')
      }
    })
  } catch (err) {
    console.log(err + "error happened in sendotp post");
    res.redirect('/error')
  }
})

router.get('/sendotp2', (req, res) => {
  try {
    let mobileNumber = req.session.number
    client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
      .verifications
      .create({ to: mobileNumber, channel: 'sms' })
      .then((verification) => {
        console.log(verification.status);
        req.session.otpSended = true
        res.redirect('/otp-page')
      }).catch((err) => {
        console.log('errrorrooro')
        console.log(err, 'err')
      })
  } catch (err) {
    console.log(err + "error happened in sendotp2 post");
    res.redirect('/error')
  }
})


router.post('/verifyotp', (req, res) => {
  try {
    //console.log(`session phone number is ${req.session.phonenumber} and otp is ${req.body}`);
    console.log(req.session.number);
    let ph_no = req.session.number
    let otp = req.body.otp
    client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
      .verificationChecks
      .create({ to: ph_no, code: otp })
      .then(verification_check => {
        console.log(verification_check.status)
        if (verification_check.status == 'approved') {
          // user=req.session.user
          // console.log('lo');
          // req.session.user=req.session.preuserx
          console.log('ok');
          res.redirect('/home')
        } else {
          console.log('entered wrong otp');
          req.session.otpErr = true;
          res.redirect('/otp-page')
        }
      });
  } catch (err) {
    console.log(err + "error happened verify otp post");
    res.redirect('/error')
  }
})

router.get('/orders', verifyUserLogin, async (req, res) => {
  try {
    let orders = await userHelpers.getUserOrders(req.session.user._id)
    //userHelpers.placeOrder(req.body,products,totalPrice).then((response)=>{
    // res.render('user/view-order', { user: req.session.user, orders ,cancelledPro:req.session.cancelledPro})
    res.render('user/view-order', { user: req.session.user, orders })
    // })
  } catch (err) {
    console.log(err + "error happened in orders get");
    res.redirect('/error')
  }
})



router.get('/cancel-order/:id', verifyUserLogin, (req, res) => {
  try {
    let proId = req.params.id
    userHelpers.cancelOrder(proId).then((response) => {
      res.redirect('/orders')
    })
  } catch (err) {
    console.log(err + "error happened in cancel order");
    res.redirect('/error')
  }
})

router.get('/profile', verifyUserLogin, async (req, res) => {
  try {
    userId = req.session.user._id
    let profile = await userHelpers.getUserProfile(userId)
    let address = await userHelpers.getAllAddress(req.session.user._id)
    let wallet = await userHelpers.getWallet(req.session.user._id)
    res.render('user/profile', { user: req.session.user, profile, address, wallet })
  } catch (err) {
    console.log(err + "error happened in profile get");
    res.redirect('/error')
  }
})

router.post('/address-saved-profile', verifyUserLogin, async (req, res) => {
  try {
    userHelpers.AddAddress(req.session.user._id, req.body).then(() => {
      res.redirect('/profile')
    })
  } catch (err) {
    console.log(err + "error happened saved address");
    res.redirect('/error')
  }
})

router.post('/edit-profile/:id', verifyUserLogin, (req, res) => {
  try {
    console.log(req.body);
    console.log('params');
    console.log(req.params.id);
    userHelpers.updateProfile(req.params.id, req.body).then(() => {
      res.redirect('/home')
    })
  } catch (err) {
    console.log(err + "error happened in edit profile");
    res.redirect('/error')
  }
})

router.get('/password', verifyUserLogin, (req, res) => {
  try {
    res.render('user/change-pass', { user: req.session.user, passError: req.session.passErr });
    req.session.passErr = false;
  } catch (err) {
    console.log(err + "error happened in get password");
    res.redirect('/error')
  }
})

router.post('/changed-pass', verifyUserLogin, (req, res) => {
  try {
    userId = req.session.user._id
    console.log(userId);
    userHelpers.changePassword(req.body, userId).then((response) => {
      if (response.statuss) {
        res.redirect('/home')
      }
      else {
        //req.session.passErr= true;
        req.session.passErr = "Enter the old password correctly";
        console.log(req.session.passErr);
        res.redirect('/password')
      }
    })
  } catch (err) {
    console.log(err + "error happened in change password");
    res.redirect('/error')
  }
})

router.get('/view-ordered-products/:id', verifyUserLogin, async (req, res) => {
  try {
    let products = await userHelpers.getOrderProducts(req.params.id)
    await userHelpers.orderStatus(req.params.id).then((order) => {
      let orderStatus = order.status
      if (orderStatus == 'placed') {
        console.log(orderStatus, 'orderstatus')
        console.log('placed called')
        res.render('user/ordered-products', { user: req.session.user, products, Placed: true, order })
      }
      if (orderStatus == 'shipped') {
        res.render('user/ordered-products', { user: req.session.user, products, Shipped: true, order })
      }
      if (orderStatus == 'cancelled') {
        console.log('canceled called')
        res.render('user/ordered-products', { user: req.session.user, products, Canceled: true, order })
      }
      if (orderStatus == 'out of delivered') {
        res.render('user/ordered-products', { user: req.session.user, products, Delivered: true, order })

      }
      if (orderStatus == 'Return Requested') {
        res.render('user/ordered-products', { user: req.session.user, products, Return: true, order })
      }
    })
  } catch (err) {
    console.log(err + "error happened in vie orderd products");
    res.redirect('/error')
  }
})


router.post('/change-order-status-to-cancel', verifyUserLogin, async (req, res) => {
  try {
    productHelpers.changeOrderStatustoCancel(req.body).then((response) => {
      req.session.cancelledPro = true;
      res.json(response)
    })
  } catch (err) {
    console.log(err + "error happened in change order status");
    res.redirect('/error')
  }
})

router.post('/address-saved', verifyUserLogin, async (req, res) => {
  try {
    userHelpers.AddAddress(req.session.user._id, req.body).then(() => {
      res.redirect('/place-order')
    })
  } catch (err) {
    console.log(err + "error happened in address saved post");
    res.redirect('/error')
  }
})

router.post('/verify-payment', verifyUserLogin, (req, res) => {
  try {
    userHelpers.verifyPayment(req.body).then(() => {
      console.log(req.body['order[receipt]']);
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
        console.log('payment succsesfull');
        res.json({ status: true })
      })
    }).catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg })
    })
  } catch (err) {
    console.log(err + "error happened in verify payment post");
    res.redirect('/error')
  }
})


//=================================Delete saved Address======================//

router.post('/delete-saved-address', verifyUserLogin, (req, res) => {
  try {
    userHelpers.deleteAddress(req.body).then((response) => {
      console.log(response);
      res.json(response)
    })
  } catch (err) {
    console.log(err + "error happened delete-saved-address post");
    res.redirect('/error')
  }
})

//=================================Edit saved Address======================//

router.post('/edit-address', verifyUserLogin, (req, res) => {
  try {
    userHelpers.updateAddress(req.body).then(() => {
      res.redirect('/place-order')
    })
  } catch (err) {
    console.log(err + "error happened in edit address post");
    res.redirect('/error')
  }
})



router.post('/coupon-applied', verifyUserLogin, (req, res) => {
  try {
    userHelpers.Promocode(req.body).then((response) => {
      if (response.couponErr == true) {
        req.session.CouponErr = 'Invalid coupon'
      }
      res.json(response)
    })
  } catch (err) {
    console.log(err + "error happened in coupon applied post");
    res.redirect('/error')
  }
})


module.exports = router;












