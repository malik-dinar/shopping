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



paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': 'AWg1WYasdHj_AUw2WqSFEIAld6COjgrNi35aalmUR_GsuqWVnd6h6WZVxtDnX4sM4p80oC5vDb_ZLD9i',
  'client_secret': 'EJVcBHZWa46bJRL-n2zzAK_wM0OdKJAKAQn31nBN41mPIeIYbBDgssueS8tAIjEu-zyie8UfXZLnNl0B'
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
  const perPage = 9;
  let pageNum;
  let skip;
  let productCount;
  let pages;
  console.log('hi');
  console.log(parseInt(req.query.page));
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

  let search='';
  console.log(req.query.search);
  if(req.query.search){
    console.log('aro searched');
    search=req.query.search

    productHelpers.getCategory().then((datacategory) => {
      productHelpers.getSearchProducts(search).then(async (products) => {
        if (req.session.user) {
          cartCount = await userHelpers.getCartCount(req.session.user._id)
          let user = req.session.user
          res.render('user/home-page', { products, admin: false, user, datacategory, cartCount});
        } else {
          res.render('user/home-page', { products, admin: false, datacategory});
        }
      })
    })
  }else{
    productHelpers.getCategory().then((datacategory) => {
      // let user=req.session.user
      productHelpers.getPaginatedProducts(skip, perPage).then(async (products) => {
        let cartCount = null;
        if (req.session.user) {
          cartCount = await userHelpers.getCartCount(req.session.user._id)
          let user = req.session.user
          res.render('user/home-page', { products, admin: false, user, datacategory, cartCount ,totalDoc: productCount, currentPage: pageNum, pages: pages});
        } else {
          res.render('user/home-page', { products, admin: false, datacategory ,totalDoc: productCount, currentPage: pageNum, pages: pages });
        }
      })
    })
  }
});

//Get login Page
router.get('/login-page', function (req, res) {
  res.render('user/login-page', { log: true });
});

router.get('/sign', (req, res) => {
  console.log('something goes wrong');
  res.render('user/signup-page', { log: true, Err: req.session.emailErr, Err1: req.session.numErr, Err2: req.session.refErr, redErr: req.session.redErr})
  req.session.emailErr = null;
  req.session.numErr = null;
  req.session.refErr = null;
  req.session.redErr = null;
});


//POST 
router.post('/signup', (req, res) => {
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
    else if (response.mismatch){
      console.log('mismatched');
      req.session.redErr = 'password Mismatched'
      res.redirect('/sign')
    }else{
      //req.session.user=response.user
      // req.session.user = response
      // console.log(req.session.user._id);
      //req.session.user = true
      console.log(response.user);
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

});


router.get('/login', function (req, res, next) {

  if (req.session.user) {
    res.redirect('/home')
  }
  else {
    // console.log('errrrrrrr');

    res.render('user/login-page', { logginErr: req.session.loginErr, log: true });
    req.session.loginErr = null;
  }
  //res.render('user/login-page',{log:true});
});


router.post('/login', (req, res, next) => {

  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      userHelpers.isBlocked(response.userData._id).then(() => {
        if (response.status) {
          req.session.user = true
          req.session.user = response.userData
          console.log('user loged');
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
});



router.get('/logout', (req, res) => {
  console.log('logourtytttt');
  req.session.user = null;
  res.redirect('/home')
});




router.get('/loginn', (req, res) => {
  res.redirect('/login')
})

/////
/////
router.get('/user-block', (req, res) => {
  userHelpers.UnblockUser().then(() => {
    res.redirect('admin/user-management')
  })
})

router.get('/product-view/:id', async (req, res) => {
  if (req.session.user) {
    let user = req.session.user
    console.log(req.params.id);
    let product = await userHelpers.getProductDetailforuser(req.params.id)
    console.log(product);
    //productHelpers.getCategoryname(req.params.id).then((allcat)=>{
    res.render('user/product-view', { admin: false, product, user });
    // })
  } else {
    let product = await userHelpers.getProductDetailforuser(req.params.id)
    console.log(product);
    // productHelpers.getCategoryname(req.params.id).then((allcat)=>{
    res.render('user/product-view', { admin: false, product });
    // })
  }
})


router.get('/category/:cat', (req, res) => {
  productHelpers.getCategory().then((datacategory) => {
    if (req.session.user) {
      productHelpers.getProductsInCategory(req.params.cat).then((products) => {
        res.render('user/home-page2', { products, datacategory })
      })
    } else {
      productHelpers.getProductsInCategory(req.params.cat).then((products) => {
        res.render('user/home-page2', { products, datacategory })
      })
    }
  })
})

// router.post('/cart',(req,res)=>{
//   console.log('hiiiiiiii');
//   // res.redirect('/cart')
// })

router.get('/cart', verifyUserLogin, async (req, res) => {
  console.log('blaa');
  console.log(req.session.user._id);
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

})

router.get('/add-to-cart/:id', async (req, res) => {
  if (req.session.user) {
    userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      console.log(req.params.id);
      res.redirect('/cart',)
    })
  }
  else {
    res.redirect('/login-page')

  }
})

router.post('/change-product-quantity',async(req, res) => {
  let availableQty;
  await productHelpers.getProductStock(req.body).then((stock)=>{
    console.log(stock,'qty,',req.body.quantity)
    availableQty=stock;
  })
    userHelpers.changeProductQuantity(req.body).then(async (response) => {
      if(parseInt(req.body.quantity)<parseInt(availableQty))
      {
        response.total = await userHelpers.getTotalAmount(req.body.user)
        //response.total=await userHelpers.getTotalAmount(req.body.user._id)
        res.json(response)
      }else{
        let responseObj={}
        responseObj.availableQty=availableQty
        responseObj.status=false
        res.json(responseObj)
      } 
    })
})

router.post('/remove-product', (req, res) => {
  userHelpers.removeProductFromCart(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/place-order', verifyUserLogin, async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalOne = await userHelpers.getAmountOne(req.session.user._id)
  let address = await userHelpers.getAllAddress(req.session.user._id)
  let wallet = await userHelpers.getWallet(req.session.user._id)
  console.log(wallet.amount);
  if (wallet.amount > total) {
    walletView = true
  }
  else {
    walletView = false
  }
    res.render('user/place-order', { user:req.session.user, total, products, totalOne, address, wallet, walletView ,Err:req.session.CouponErr});
    req.session.CouponErr= null
})

router.get('/continue-shopping', verifyUserLogin, (req, res) => {
  res.redirect('/home')
})

router.get('/order-placed', (req, res) => {
  res.render('user/order-placed');
})

router.post('/place-order', verifyUserLogin, async (req, res) => {
  let userId = req.session.user._id
  let totalPrice=0
  let products = await userHelpers.getCartProductList(userId)
   totalPrice = await userHelpers.getTotalAmount(userId)
  if(req.body.couponName){
    console.log('hello');
    console.log(req.body.couponName);
    totalPrice = await userHelpers.getTotalAmount(userId)
    let discountAmount = await userHelpers.PromocodePlace(req.body.couponName,totalPrice)
    totalPrice = totalPrice-discountAmount
  }else{
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
          "return_url": "http://localhost:3000/order-placed",
          "cancel_url": "http://localhost:3000/place-order"
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
      userHelpers.useWallet(userId,totalPrice)
      res.json({ codSuccess: true })
    } else {
      res.send('Error');
    }
  })
})





// Get Otp login Page
router.get('/otp-page', (req, res) => {
  console.log('22');
  res.render('user/otp-page', { otpSended: req.session.otpSended ,  otp: req.session.otpSend ,  noaccount: req.session.noaccount , otpErr:req.session.otpErr})
  req.session.otpSended = false;
  req.session.noaccount=false;
   req.session.otpErr=false;
})

//POST Send Otp To Twilio 
router.post('/sendotp', (req, res) => {
  userHelpers.checkUser(req.body).then((response) => {
    if (response.user) {
      let ph_no = (`+91${req.body.number}`)
      req.session.number = ph_no;
      client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
        .verifications
        .create({ to: ph_no, channel: 'sms' })
        .then(verification => {
          console.log('pending');
          console.log(verification.status)
          //  req.session.preuser=response.user
          req.session.user = response.user
          req.session.otpSended = true;
          req.session.otpSend=true;
          res.redirect('/otp-page')
        })
    } else {
      console.log('number is not in db');
      req.session.noaccount= true;
      res.redirect('/otp-page')
    }
  })
})

router.get('/sendotp2', (req, res) => {
  let mobileNumber = req.session.number
  client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
    .verifications
    .create({ to: mobileNumber, channel: 'sms' })
    .then((verification) => {
      console.log(verification.status);
      req.session.otpSended = true
      res.redirect('/otp-page')
    }).catch((err)=>{
      console.log('errrorrooro')
      console.log(err,'err')
    })
})


router.post('/verifyotp', (req, res) => {
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
        req.session.otpErr=true;
        res.redirect('/otp-page')
      }
    });

})

router.get('/orders', verifyUserLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  //userHelpers.placeOrder(req.body,products,totalPrice).then((response)=>{
  // res.render('user/view-order', { user: req.session.user, orders ,cancelledPro:req.session.cancelledPro})
  res.render('user/view-order', { user: req.session.user, orders })

  // })
})



router.get('/cancel-order/:id', (req, res) => {
  let proId = req.params.id
  userHelpers.cancelOrder(proId).then((response) => {
    res.redirect('/orders')
  })
})

router.get('/profile', verifyUserLogin, async (req, res) => {
  userId = req.session.user._id
  let profile = await userHelpers.getUserProfile(userId)
  let address = await userHelpers.getAllAddress(req.session.user._id)
  let wallet = await userHelpers.getWallet(req.session.user._id)
  res.render('user/profile', { user: req.session.user, profile, address, wallet })


})

router.post('/address-saved-profile', verifyUserLogin, async (req, res) => {
  userHelpers.AddAddress(req.session.user._id, req.body).then(() => {
    res.redirect('/profile')
  })
})

router.post('/edit-profile/:id', (req, res) => {
  console.log(req.body);
  console.log('params');
  console.log(req.params.id);
  userHelpers.updateProfile(req.params.id, req.body).then(() => {
    res.redirect('/home')
  })
})

router.get('/password', verifyUserLogin, (req, res) => {
  res.render('user/change-pass', { user: req.session.user, passError: req.session.passErr });
  req.session.passErr = false;
})

router.post('/changed-pass', verifyUserLogin, (req, res) => {
  userId = req.session.user._id
  console.log(userId);
  userHelpers.changePassword(req.body, userId).then((response) => {
    if (response.statuss) {
      res.redirect('/home')
    }
    else {
      //req.session.passErr= true;
      console.log('ko');
      req.session.passErr = "Enter the old password correctly";
      console.log(req.session.passErr);
      res.redirect('/password')
    }
  })

})

router.get('/view-ordered-products/:id', async (req, res) => {
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
})


router.post('/change-order-status-to-cancel', async (req, res) => {
  productHelpers.changeOrderStatustoCancel(req.body).then((response) => {
    req.session.cancelledPro = true;
    res.json(response)
  })
})

router.post('/address-saved', verifyUserLogin, async (req, res) => {
  userHelpers.AddAddress(req.session.user._id, req.body).then(() => {
    res.redirect('/place-order')
  })
})

router.post('/verify-payment', (req, res) => {
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
})


//=================================Delete saved Address======================//

router.post('/delete-saved-address', (req, res) => {
  userHelpers.deleteAddress(req.body).then((response) => {
    console.log(response);
    res.json(response)
  })
})

//=================================Edit saved Address======================//

router.post('/edit-address', (req, res) => {
  console.log('look at this');
  console.log(req.body);
  userHelpers.updateAddress(req.body).then(() => {
    res.redirect('/place-order')
  })
})



router.post('/coupon-applied',(req,res)=>{
  console.log(req.body);
  userHelpers.Promocode(req.body).then((response)=>{
    if(response.couponErr==true)
    {
      req.session.CouponErr='Invalid coupon'
    }
    res.json(response)
  })
})


module.exports = router;












