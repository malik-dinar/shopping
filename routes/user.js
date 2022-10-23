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
  productHelpers.getCategory().then((datacategory) => {
    // let user=req.session.user
    productHelpers.getAllProducts().then(async (products) => {
      let cartCount = null;
      if (req.session.user) {
        cartCount = await userHelpers.getCartCount(req.session.user._id)
        let user = req.session.user
        res.render('user/home-page', { products, admin: false, user, datacategory, cartCount });
      } else {
        res.render('user/home-page', { products, admin: false, datacategory });
      }
    })
  })
});

//Get login Page
router.get('/login-page', function (req, res) {
  res.render('user/login-page', { log: true });
});

//POST 
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    //
    console.log('response');
    // req.session.user=true
    req.session.user = response
    // let user=req.session.user
    res.redirect('/home')

  })

});


router.get('/login', function (req, res, next) {

  if (req.session.user) {
    res.redirect('/home')
  }
  else {
    // console.log('errrrrrrr');

    res.render('user/login-page', { logginErr: req.session.loginErr, log: true });
    req.session.logginErr = null;
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

router.get('/sign', (req, res) => {
  res.render('user/signup-page', { log: true })
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
        console.log("this is")
        console.log(datacategory);
        console.log(products);
        res.render('user/home-page2', { products, datacategory })
      })
    } else {
      productHelpers.getProductsInCategory(req.params.cat).then((products) => {
        console.log('category pagae with out session');
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

router.post('/change-product-quantity', (req, res) => {
  console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    //response.total=await userHelpers.getTotalAmount(req.body.user._id)

    res.json(response)
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
  console.log(totalOne);
  res.render('user/place-order', { user: req.session.user, total, products, totalOne, address });
})

router.get('/continue-shopping', verifyUserLogin, (req, res) => {
  res.redirect('/home')
})

router.get('/order-placed', (req, res) => {
  res.render('user/order-placed');
})

router.post('/place-order', verifyUserLogin, async (req, res) => {
  console.log(req.body);
  let userId = req.session.user._id
  // console.log(userId);
  let products = await userHelpers.getCartProductList(userId)
  let totalPrice = await userHelpers.getTotalAmount(userId)

  userHelpers.placeOrder(req.body, products, totalPrice, userId).then(async (orderId) => {
    console.log(req.body);
    console.log(req.body['paymentMethod']);
    // res.redirect('/order-placed');
    if (req.body['paymentMethod'] == 'COD') {
      res.json({ codSuccess: true })
    }
    else if (req.body['paymentMethod'] == 'Razorpay') {
      await userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        response.razor=true
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
      userHelpers.createPay( payment ) 
          .then( ( transaction ) => {
              var id = transaction.id; 
              var links = transaction.links;
              var counter = links.length; 
              while( counter -- ) {
                  if ( links[counter].rel === 'approval_url') {     //  if ( links[counter].method == 'REDIRECT') {  
            // redirect to paypal where user approves the transaction 
                      // res.json({paypalsuccess:true})  ///i added
                      console.log(links[counter].href);
                      // return res.redirect( links[counter].href ) 
                      transaction.pay=true
                      transaction.linkto=links[counter].href
                      transaction.orderId=orderId
                      console.log(payment)
                      userHelpers.changePaymentStatus(orderId).then(() => {
                          res.json(transaction)
                      })
             
                  }
              }
          })
        .catch((err) => {
          console.log(err);
          console.log('35');
          res.redirect('/place-order');
        });
    } else {
      res.send('Error');
    }
  })
})




// Get Otp login Page
router.get('/otp-page', (req, res) => {
  res.render('user/otp-page')
})

//POST Send Otp To Twilio 
router.post('/sendotp', (req, res) => {
  console.log(req.body);
  userHelpers.checkUser(req.body).then((response) => {
    console.log(response);
    if (response.user) {
      let ph_no = (`+91${req.body.number}`)
      req.session.number = ph_no;
      client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
        .verifications
        .create({ to: ph_no, channel: 'sms' })
        .then(verification => {
          console.log(verification.status)
          //  req.session.preuser=response.user
          req.session.user = response.user //sthyuh
          res.render('user/otp-page', { otpSend: true })
        })
    } else {
      res.render('user/otp-page', { noaccount: true })
    }
  })
})

router.post('/verifyotp', (req, res) => {
  // console.log(`session phone number is ${req.session.phonenumber} and otp is ${req.body}`);
  console.log(req.session.number);
  let ph_no = req.session.number
  let otp = req.body.otp

  client.verify.v2.services('VA4c79484d8c15cb91629c185adacb4c30')
    .verificationChecks
    .create({ to: ph_no, code: otp })
    .then(verification_check => {
      console.log(verification_check.status)
      if (verification_check.status == 'approved') {
        user=req.session.user
        console.log(user);
        //req.session.user=req.session.preuser

        res.redirect('/home')
      } else {
        res.render('user/otp-page', { otpErr: true })
      }
    });

})

router.get('/orders', verifyUserLogin, async (req, res) => {
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  //userHelpers.placeOrder(req.body,products,totalPrice).then((response)=>{
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
  res.render('user/profile', { user: req.session.user, profile })
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
  res.render('user/change-pass', { user: req.session.user });
})

router.post('/changed-pass', verifyUserLogin, (req, res) => {
  userId = req.session.user._id
  console.log(userId);
  userHelpers.changePassword(req.body, userId).then((response) => {
    if (response.statuss) {
      res.redirect('/home')
    }
    else {
      res.send('In correct existing password')
    }
  })

})

router.get('/view-ordered-products/:id', async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/ordered-products', { user: req.session.user, products })
})

router.post('/change-order-status-to-cancel', async (req, res) => {
  productHelpers.changeOrderStatustoCancel(req.body).then((response) => {
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

router.post('/delete-saved-address',(req,res)=>{
  console.log('check post');
  console.log(req.body);
  userHelpers.deleteAddress(req.body).then((response)=>{
    console.log('reached');
    console.log(response);
    res.json(response)
  })
})



module.exports = router;












