var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');

const emailDB="admin@gmail.com"
const passDB="admin"
/* GET users listing. */
// router.get('/', function(req, res, next) {

//   productHelpers.getAllProducts().then((products)=>{
//     res.render('admin/admin-panel',{products,admin:true});
//   })f
// });
const verifyAdminLogin=(req,res,next)=>{
  if(req.session.loggin)
  {
    next()
  } 
  else{
    //res.redirect('/')
    res.redirect('/admin') 
  }
}

router.get('/', function(req, res, next) {
    res.render('admin/admin-login',{log:true});
});
router.get('/logout-admin', function(req, res, next) {
  res.redirect('/admin');
});

// router.get('/admin-pannel',(req,res)=>{
//   productHelpers.getAllProducts().then((products)=>{
//   res.render('admin/addmin-panel',{products,admin:true})
//   })
// })


router.post('/',(req,res)=>{
  const user={email,password}=req.body
  if(emailDB==email && passDB==password){
    req.session.loggin=true
    res.redirect('/admin/admin-panel')
  }else{
    res.redirect('/admin')
  }
})

router.get('/admin-panel',(req,res)=>{
  productHelpers.getAllProducts().then((products)=>{
    res.render('admin/admin-panel',{products,admin:true})
    })
})



router.get('/add-product',(req,res)=>{  
  productHelpers.getCategory().then((datacategory)=>{
    res.render('admin/add-product',{admin:true,datacategory})
  })
})



router.post('/add-product',(req,res)=>{   
  req.body.price=parseInt(req.body.price) 
  req.body.stock=parseInt(req.body.stock)
  productHelpers.addProduct(req.body).then((id)=>{ 
    let image=req.files.image
    let image2 = req.files.image2
    let image3 = req.files.image3
        image.mv('./public/product-images/' +  id+ '.jpg')
        image2.mv('./public/product-images/' + id + '2.jpg')
        image3.mv('./public/product-images/' +  id+ '3.jpg', (err, done) =>  {
            if (!err) {
              res.redirect('/admin/admin-panel')
            }
            else{
              console.log('eerrre');
              console.log(err)
            } 
        })
  }) 
})


router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/admin-panel')
  })
})

router.get('/edit-product/:id',async(req,res)=>{

   let product=await productHelpers.getProductDetails(req.params.id)
   //console.log(product);     
   productHelpers.getCategory().then((datacategory)=>{

    //productHelpers.getCategoryname(req.params.id).then((allcat)=>{
      res.render('admin/edit-product',{admin:true,product,datacategory})
   // }) 
  })  
})


router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  req.body.price=parseInt(req.body.price) 
   productHelpers.updateproduct(req.params.id,req.body).then(()=>{ 
      if(req.files.image){
        let image=req.files.image
        image.mv('./public/product-images/'+id+'.jpg')
        }
        res.redirect('/admin/admin-panel')
    })
})

router.get('/admin-pannel',(req,res)=>{
  res.redirect('/admin/admin-panel')
})





router.get('/user-management',(req,res)=>{
  productHelpers.getUser().then((user)=>{
      res.render('admin/user-management',{user,admin:true})
  })
})

router.get('/user-block/:id',(req,res)=>{
  userHelpers.blockUser(req.params.id).then(()=>{
    req.session.BError=true;
    req.session.user=null;
    res.redirect('/admin/user-management')
  })
})

router.get('/user-unblock/:id',(req,res)=>{
  userHelpers.UnblockUser(req.params.id).then(()=>{
    res.redirect('/admin/user-management')
  })
})


router.get('/category-admin',(req,res)=>{
  productHelpers.getCategory(req.body).then((datacategory)=>{
    console.log(datacategory);
    res.render('admin/category-admin',{datacategory,admin:true,CatErr:req.session.CatErr})
    req.session.CatErr=null
  }) 
})



router.post('/add-category',(req,res)=>{ 
  productHelpers.addCategory(req.body).then((id)=>{ 
    console.log(req.body);
    console.log('set');
    if(id.exist){
      req.session.CatErr="Category already exist"
      res.redirect('/admin/category-admin');
    }else{
      res.redirect('/admin/category-admin');
    }

  })
})

router.get('/delete-category/:cat',(req,res)=>{
  let catId=req.params.cat
  console.log(catId);
  productHelpers.deleteCategory(catId).then((response)=>{
    if(response.DeleteStatus){
      res.redirect('/admin/category-admin')
    }
    else{
      req.session.CatErr="This category cannot be deleted since it has product"
      res.redirect('/admin/category-admin')
    }
  })
})

router.get('/edit-category/:cat',async(req,res)=>{
  let catname=req.params.cat
  let oneCat=await productHelpers.getOneCatergory(catname)

    res.render('admin/edit-category',{admin:true,oneCat})
})

router.post('/edit-category/:cat',(req,res)=>{
  //console.log(cat); 
  let newCat=req.body.category
  productHelpers.editCategory(newCat,req.params.cat).then(()=>{
    res.redirect('/admin/category-admin')
  })  
})


router.get('/orders-admin', verifyAdminLogin,(req,res)=>{
  userHelpers.getOrders().then((order)=>{
    res.render('admin/order',{admin:true,order})
  })
})
 
//=============================Admin======================cancel order//

// router.get('/cancel-order-admin/:id',(req,res)=>{
//   let proId=req.params.id
//   userHelpers.cancelOrderAdmin(proId).then((response)=>{
//     res.redirect('/orders')
//   })
// })

router.post('/change-order-status',(req,res)=>{
  productHelpers.changeOrderStatus(req.body).then(()=>{
    console.log('find wallet from this');
    console.log(req.body);
    res.json(response)
    // res.redirect('/orders')
  })

})

router.get('/view-ordered-products-admin/:id',async(req,res)=>{

  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('admin/ordered-pro-admin',{admin:true,products})
})


router.get('/view-ordered-users-admin/:id',async(req,res)=>{

  let users=await userHelpers.getOrderUser(req.params.id)
  res.render('admin/ordered-user',{admin:true,users})
})


//================================= Admin dashboard =======================//

router.get('/admin-dashboard',async(req,res)=>{
  let total=await userHelpers.TotalSale()
  let totalUsers= await userHelpers.totalUsers()
  let totalOrders= await userHelpers.totalOrders()
//  let date= await userHelpers.allDate()                                              //daily set
  let status= await userHelpers.stausHistory()
  let orders=await userHelpers.getOrders2()
  let monthlySale= await userHelpers.monthlySale()
  let getmonths= await userHelpers.getMonths()
  let getYears= await userHelpers.getYears()
  let getDays= await userHelpers.getDays()
  userHelpers.getOrders().then((order)=>{
    res.render('admin/admin-dashboard',{admin:true,total,status,totalUsers,totalOrders,orders,monthlySale,getmonths,getYears,getDays,order});
  })
})

router.get('/view-users-products/:id',async(req,res)=>{
  let users=await userHelpers.getOrderUser(req.params.id)
  let products=await userHelpers.getOrderProducts(req.params.id)
  res.render('admin/pro-and-users',{admin:true,users,products})
})



router.get('/coupon-page',async(req,res)=>{
  let coupon=await productHelpers.getCouponCode()
  res.render('admin/coupon-page',{admin:true,coupon,Err:req.session.AlreadyExists})
  req.session.AlreadyExists=false;

})

router.post('/add-coupon',(req,res)=>{
  productHelpers.addCoupon(req.body).then((couponAlreadyexist)=>{
    if(couponAlreadyexist){
      req.session.AlreadyExists='Coupon already Exists'
      res.redirect('/admin/coupon-page')
    }else{
      console.log('coupon added');
      res.redirect('/admin/coupon-page')
    }
  })
})

router.post('/delete-coupon',(req,res)=>{
  console.log('hi');
  const obj = JSON.parse(JSON.stringify(req.body));
  console.log(obj);
  productHelpers.deleteCoupon(obj).then((response)=>{
   res.json(response)
  })
})



router.get('/offer-cat',async(req,res)=>{
  productHelpers.getCategory().then((datacategory)=>{
    productHelpers.getCategoryOffer().then((alloffer)=>{
      productHelpers.getAllProducts().then((products)=>{
        productHelpers.getAllproductOffer().then((proffer)=>{
          res.render('admin/offer-page',{admin:true,datacategory,alloffer,exists:req.session.Alreadyexist,products,proffer})
          req.session.Alreadyexist=false;
        })
      })      
    })
  }) 
})


router.post('/add-offer-category',(req,res)=>{
  productHelpers.addCategoryOffer(req.body).then(()=>{
    if(offerAlreadyexist){
      req.session.Alreadyexist=true
      res.redirect('/admin/offer-cat')
    }else{
      res.redirect('/admin/offer-cat')
    }
  })
})


router.post('/delete-offer',(req,res)=>{
  productHelpers.deleteOffer(req.body).then((response)=>{
   res.json(response)
  })
})

router.post('/add-offer-product',(req,res)=>{
  productHelpers.addProductOffer(req.body).then(()=>{
    res.redirect('/admin/offer-cat')
  })
})

router.post('/offer-applied',(req,res)=>{
  productHelpers.productOfferApplied(req.body).then(()=>{
    res.redirect('/admin/offer-cat')
  })
})

router.post('/delete-offer-product',(req,res)=>{
  productHelpers.deleteProductOffer(req.body).then((response)=>{
    res.json(response)
  })
})


router.get('/banner', verifyAdminLogin,(req,res)=>{
    res.render('admin/banner',{admin:true})
})
module.exports = router;

