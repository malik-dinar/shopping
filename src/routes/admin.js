var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const Handlebars = require('handlebars');


const emailDB = "admin@gmail.com"
const passDB = "admin"
/* GET users listing. */
// router.get('/', function(req, res, next) {

//   productHelpers.getAllProducts().then((products)=>{
//     res.render('admin/admin-panel',{products,admin:true});
//   })f
// });
const verifyAdminLogin = (req, res, next) => {
  if (req.session.loggin) {
    next()
  }
  else {
    //res.redirect('/')
    res.redirect('/admin')
  }
}

router.get('/', function (req, res, next) {
  res.render('admin/admin-login', { log: true });
});
router.get('/logout-admin', function (req, res, next) {
  try {
    res.redirect('/admin');
  } catch (err) {
    console.log(err + "error happened logout admin");
    res.redirect('/error')
  }
});

// router.get('/admin-pannel',(req,res)=>{
//   productHelpers.getAllProducts().then((products)=>{
//   res.render('admin/addmin-panel',{products,admin:true})
//   })
// })


router.post('/', (req, res) => {
  try {
    const user = { email, password } = req.body
    if (emailDB == email && passDB == password) {
      req.session.loggin = true
      res.redirect('/admin/admin-panel')
    } else {
      res.redirect('/admin')
    }
  } catch (err) {
    console.log(err + "error happened admin home / post");
    res.redirect('/error')
  }
})

router.get('/admin-panel',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.getAllProducts().then((products) => {
      res.render('admin/admin-panel', { products, admin: true })
    })
  } catch (err) {
    console.log(err + "error happened in admin home page");
    res.redirect('/error')
  }
})



router.get('/add-product', verifyAdminLogin, (req, res) => {
  try {
    productHelpers.getCategory().then((datacategory) => {
      res.render('admin/add-product', { admin: true, datacategory })
    })
  } catch (err) {
    console.log(err + "error happened in admin get add product");
    res.redirect('/error')
  }
})



router.post('/add-product',verifyAdminLogin, (req, res) => {
  try {
    req.body.price = parseInt(req.body.price)
    req.body.stock = parseInt(req.body.stock)
    productHelpers.
    addProduct(req.body).then((id) => {
      let image = req.files.image
      let image2 = req.files.image2
      let image3 = req.files.image3
      image.mv('./public/product-images/' + id + '.jpg')
      image2.mv('./public/product-images/' + id + '2.jpg')
      image3.mv('./public/product-images/' + id + '3.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/admin-panel')
        }
        else {
          console.log('eerrre');
          console.log(err)
        }
      })
    })
  } catch (err) {
    console.log(err + "error happened in admin add product post");
    res.redirect('/error')
  }
})


router.get('/delete-product/:id', verifyAdminLogin, (req, res) => {
  try {
    let proId = req.params.id
    console.log(proId);
    productHelpers.deleteProduct(proId).then((response) => {
      res.redirect('/admin/admin-panel')
    })
  } catch (err) {
    console.log(err + "error happened in admin delete product get");
    res.redirect('/error')
  }
})

router.get('/edit-product/:id',verifyAdminLogin, async (req, res) => {
  try {
    let product = await productHelpers.getProductDetails(req.params.id)
    //console.log(product);     
    productHelpers.getCategory().then((datacategory) => {
      //productHelpers.getCategoryname(req.params.id).then((allcat)=>{
      res.render('admin/edit-product', { admin: true, product, datacategory })
      // }) 
    })
  } catch (err) {
    console.log(err + "error happened in admin edit product get");
    res.redirect('/error')
  }
})


router.post('/edit-product/:id',verifyAdminLogin,(req, res) => {
  try {
    let id = req.params.id
    req.body.price = parseInt(req.body.price)
    productHelpers.updateproduct(req.params.id, req.body).then(() => {
      if (req.files) {
        let image = req.files.image;
        let image2 = req.files.image2;
        let image3 = req.files.image3;
        if (image) {
            image.mv('./public/product-images/' + req.params.id + '.jpg', (err, done) => {
                if (err) {
                    console.log(err)
                }
            })
        }
        if (image2) {
            image2.mv('./public/product-images/' + req.params.id + '2.jpg', (err, done) => {
                if (err) {
                    console.log(err)
                }
            })
        }
        if (image3) {
            image3.mv('./public/product-images/' + req.params.id + '3.jpg', (err, done) => {
                if (err) {
                    console.log(err)
                }
            })
        }
    }

      res.redirect('/admin/admin-panel') 
    }).catch((err) => {
      console.log(err + "error happened in admin edit product post");
      res.redirect('/error')
    })
  }catch (err) {
    console.log(err + "error happened in admin edit product post");
    res.redirect('/error') 
  }
})

router.get('/admin-pannel',verifyAdminLogin, (req, res) => {
  try {
    res.redirect('/admin/admin-panel')
  } catch (err) {
    console.log(err + "error happened in admin admin pannel");
    res.redirect('/error')
  }
})





router.get('/user-management',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.getUser().then((user) => {
      res.render('admin/user-management', { user, admin: true })
    }).catch((err) => {
      console.log(err + "error happened in admin user-management");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in admin user-management");
    res.redirect('/error')
  }
})

router.get('/user-block/:id',verifyAdminLogin, (req, res) => {
  try {
    userHelpers.blockUser(req.params.id).then(() => {
      req.session.BError = true;
      req.session.user = null;
      res.redirect('/admin/user-management')
    }).catch((err) => {
      console.log(err + "error happened in admin user-block get");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in admin user-block get");
    res.redirect('/error')
  }
})

router.get('/user-unblock/:id',verifyAdminLogin, (req, res) => {
  try {
    userHelpers.UnblockUser(req.params.id).then(() => {
      res.redirect('/admin/user-management')
    }).catch((err) => {
      console.log(err + "error happened in admin user-unblock get");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in admin user-unblock get");
    res.redirect('/error')
  }
})


router.get('/category-admin',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.getCategory(req.body).then((datacategory) => {
      console.log(datacategory);
      res.render('admin/category-admin', { datacategory, admin: true, CatErr: req.session.CatErr })
      req.session.CatErr = null
    }).catch((err) => {
      console.log(err + "error happened in admin category-admin");
      res.redirect('/error')
    })
  } catch (err) {
    console.log(err + "error happened in admin category-admin");
    res.redirect('/error')
  }
})



router.post('/add-category',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.addCategory(req.body).then((id) => {
      console.log(req.body);
      console.log('set');
      if (id.exist) {
        req.session.CatErr = "Category already exist"
        res.redirect('/admin/category-admin');
      } else {
        res.redirect('/admin/category-admin');
      }
    })
  } catch (err) {
    console.log(err + "error happened in admin add category post");
    res.redirect('/error')
  }
})

router.get('/delete-category/:cat',verifyAdminLogin, (req, res) => {
  try {
    let catId = req.params.cat
    console.log(catId);
    productHelpers.deleteCategory(catId).then((response) => {
      if (response.DeleteStatus) {
        res.redirect('/admin/category-admin')
      }
      else {
        req.session.CatErr = "This category cannot be deleted since it has product"
        res.redirect('/admin/category-admin')
      }
    })
  } catch (err) {
    console.log(err + "error happened in admin delete");
    res.redirect('/error')
  }
})

router.get('/edit-category/:cat', verifyAdminLogin,async (req, res) => {
  try {
    let catname = req.params.cat
    let oneCat = await productHelpers.getOneCatergory(catname)
    res.render('admin/edit-category', { admin: true, oneCat })
  } catch (err) {
    console.log(err + "error happened in admin edit-category get");
    res.redirect('/error')
  }
})

router.post('/edit-category/:cat',verifyAdminLogin, (req, res) => {
  try {
    //console.log(cat); 
    let newCat = req.body.category
    productHelpers.editCategory(newCat, req.params.cat).then(() => {
      res.redirect('/admin/category-admin')
    })
  } catch (err) {
    console.log(err + "error happened in admin edit-category post");
    res.redirect('/error')
  }
})


router.get('/orders-admin', verifyAdminLogin, async (req, res) => {
  try {
    userHelpers.getOrders().then((order) => {
      res.render('admin/order', { admin: true, order })
    })
  } catch (err) {
    console.log(err + "error happened in admin orders");
    res.redirect('/error')
  }
})

//=============================Admin======================cancel order//

// router.get('/cancel-order-admin/:id',(req,res)=>{
//   let proId=req.params.id
//   userHelpers.cancelOrderAdmin(proId).then((response)=>{
//     res.redirect('/orders')
//   })
// })

router.post('/change-order-status',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.changeOrderStatus(req.body).then(() => {
      res.json(response)
  
    })
  } catch (err) {
    console.log(err + "error happened in admin cange order status");
    res.redirect('/error')
  }
})

router.get('/view-ordered-products-admin/:id',verifyAdminLogin, async (req, res) => {
  try {
    let products = await userHelpers.getOrderProducts(req.params.id)
    res.render('admin/ordered-pro-admin', { admin: true, products })
  } catch (err) {
    console.log(err + "error happened in admin view-ordered-products-admin get");
    res.redirect('/error')
  }
})


router.get('/view-ordered-users-admin/:id', verifyAdminLogin, async (req, res) => {
  try {
    let users = await userHelpers.getOrderUser(req.params.id)
    res.render('admin/ordered-user', { admin: true, users })
  } catch (err) {
    console.log(err + "error happened in admin view-ordered-users-admin get");
    res.redirect('/error')
  }
})


//================================= Admin dashboard =======================//

router.get('/admin-dashboard',verifyAdminLogin, async (req, res) => {
  try {
    let total = await userHelpers.TotalSale()
    let totalUsers = await userHelpers.totalUsers()
    let totalOrders = await userHelpers.totalOrders()
    //  let date= await userHelpers.allDate()                                              //daily set
    let status = await userHelpers.stausHistory()
    let orders = await userHelpers.getOrders2()
    let monthlySale = await userHelpers.monthlySale()
    let getmonths = await userHelpers.getMonths()
    let getYears = await userHelpers.getYears()
    let getDays = await userHelpers.getDays()
    userHelpers.getOrders().then((order) => {
      res.render('admin/admin-dashboard', { admin: true, total, status, totalUsers, totalOrders, orders, monthlySale, getmonths, getYears, getDays, order });
    })
  } catch (err) {
    console.log(err + "error happened in admin dashboard");
    res.redirect('/error')
  }
})

router.get('/view-users-products/:id', verifyAdminLogin, async (req, res) => {
  try {
    let users = await userHelpers.getOrderUser(req.params.id)
    let products = await userHelpers.getOrderProducts(req.params.id)
    res.render('admin/pro-and-users', { admin: true, users, products })
  } catch (err) {
    console.log(err + "error happened in admin view-users-products get");
    res.redirect('/error')
  }
})



router.get('/coupon-page',verifyAdminLogin, async (req, res) => {
  try {
    let coupon = await productHelpers.getCouponCode()
    res.render('admin/coupon-page', { admin: true, coupon, Err: req.session.AlreadyExists })
    req.session.AlreadyExists = false;
  } catch (err) {
    console.log(err + "error happened in admin coupon page");
    res.redirect('/error')
  }
})

router.post('/add-coupon',verifyAdminLogin, (req, res) => {
  try {
    productHelpers.addCoupon(req.body).then((couponAlreadyexist) => {
      if (couponAlreadyexist) {
        req.session.AlreadyExists = 'Coupon already Exists'
        res.redirect('/admin/coupon-page')
      } else {
        console.log('coupon added');
        res.redirect('/admin/coupon-page')
      }
    })
  } catch (err) {
    console.log(err + "error happened in admin add coupon post");
    res.redirect('/error')
  }
})

router.post('/delete-coupon',verifyAdminLogin, (req, res) => {
  try {
    console.log('hi');
    const obj = JSON.parse(JSON.stringify(req.body));
    console.log(obj);
    productHelpers.deleteCoupon(obj).then((response) => {
      res.json(response)
    })
  } catch (err) {
    console.log(err + "error happened in admin delete coupon");
    res.redirect('/error')
  }
})



router.get('/offer-cat',verifyAdminLogin, async (req, res) => {
   try{
    productHelpers.getCategory().then((datacategory) => {
      productHelpers.getCategoryOffer().then((alloffer) => {
        productHelpers.getAllProducts().then((products) => {
          productHelpers.getAllproductOffer().then((proffer) => {
            res.render('admin/offer-page', { admin: true, datacategory, alloffer, exists: req.session.Alreadyexist, products, proffer })
            req.session.Alreadyexist = false;
          }).catch((err)=>{
            console.log(err + "error happened in admin offer-cat get");
            res.redirect('/error')
          })
        }).catch((err)=>{
          console.log(err + "error happened in admin offer-cat get");
          res.redirect('/error')
        })
      }).catch((err)=>{
        console.log(err + "error happened in admin offer-cat get");
        res.redirect('/error')
      })
    }).catch((err)=>{
      console.log(err + "error happened in admin offer-cat get");
      res.redirect('/error')
    })
  }catch (err) {
    console.log(err + "error happened in admin offer-cat get");
    res.redirect('/error')
  }
})


router.post('/add-offer-category',verifyAdminLogin, (req, res) => {
   try{
    productHelpers.addCategoryOffer(req.body).then(() => {
      if (offerAlreadyexist) {
        req.session.Alreadyexist = true
        res.redirect('/admin/offer-cat')
      } else {
        res.redirect('/admin/offer-cat')
      }
    }).catch((err)=>{
      console.log(err + "error happened in admin /add-offer-category post");
      res.redirect('/error')
    })
   }catch (err) {
    console.log(err + "error happened in admin /add-offer-category post");
    res.redirect('/error')
  }
})


router.post('/delete-offer',verifyAdminLogin, (req, res) => {
  productHelpers.deleteOffer(req.body).then((response) => {
    res.json(response)
  }).catch((err)=>{
    console.log(err + "error happened in admin delete offer");
    res.redirect('/error')
  })
})

router.post('/add-offer-product',verifyAdminLogin, (req, res) => {
  productHelpers.addProductOffer(req.body).then(() => {
    res.redirect('/admin/offer-cat')
  }).catch((err)=>{
    console.log(err + "error happened in admin add offer product");
    res.redirect('/error')
  })
})

router.post('/offer-applied',verifyAdminLogin, (req, res) => {
  productHelpers.productOfferApplied(req.body).then(() => {
    res.redirect('/admin/offer-cat')
  }).catch((err)=>{
    console.log(err + "error happened in admin offer applied post");
    res.redirect('/error')
  })
})

router.post('/delete-offer-product',verifyAdminLogin, (req, res) => {
  productHelpers.deleteProductOffer(req.body).then((response) => {
    res.json(response)
  }).catch((err)=>{
    console.log(err + "error happened in admin delete offer product");
    res.redirect('/error')
  })
})


router.get('/banner', verifyAdminLogin, async (req, res) => {
   try{
    let banners = await productHelpers.getBanner();
    res.render('admin/banner', { admin: true, banners })
   }catch (err) {
    console.log(err + "error happened in admin banner");
    res.redirect('/error')
  }
})

router.post('/add-Banner',verifyAdminLogin, (req, res) => {
   try{
    productHelpers.addBanner(req.body).then((id) => {
      let image = req.files.image
      image.mv('./public/banner-images/' + id + '.jpg', (err, done) => {
        if (!err) {
          res.redirect('/admin/banner')
        } else {
          console.log(err);
        }
      })
    })
   }catch (err) {
    console.log(err + "error happened in admin add banner post");
    res.redirect('/error')
  }
})  

router.post('/delete-banner',(req,res)=>{
  try{
    productHelpers.deleteBanner(req.body).then((response)=>{
      res.json(response)
    }).catch((err)=>{
      console.log(err);
      res.redirect('/error')
    })
  }catch (err) {
    console.log(`${err}error happened in admin delte banner`);
    res.redirect('/error')
  }
})


module.exports = router;

