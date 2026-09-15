import userModel from"../models/userModel.js";
import{addLog,getActorName}from"../utils/activityLogger.js";

const normalizeCartData=(cartData={})=>{
  if(!cartData||typeof cartData!=="object"||Array.isArray(cartData))return{};

  const normalized={};

  for(const productId of Object.keys(cartData)){
    const sizes=cartData[productId];

    if(!sizes||typeof sizes!=="object"||Array.isArray(sizes))continue;

    const normalizedProductId=String(productId);
    normalized[normalizedProductId]={};

    for(const size of Object.keys(sizes)){
      const normalizedSize=String(size).trim().toUpperCase();
      const qty=Number(sizes[size]);

      if(normalizedSize&&Number.isFinite(qty)&&qty>0){
        normalized[normalizedProductId][normalizedSize]=qty;
      }
    }

    if(Object.keys(normalized[normalizedProductId]).length===0){
      delete normalized[normalizedProductId];
    }
  }

  return normalized;
};

const safeAddLog=async(data)=>{
  try{
    await addLog(data);
  }catch(error){
    console.log("ACTIVITY LOG ERROR:",error?.message||error);
  }
};

const addToCart=async(req,res)=>{
  try{
    const{itemId,size,quantity=1}=req.body;
    const userId=req.userId;

    if(!userId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized"
      });
    }

    if(!itemId||!size){
      return res.status(400).json({
        success:false,
        message:"Item ID and size required"
      });
    }

    const normalizedItemId=String(itemId).trim();
    const normalizedSize=String(size).trim().toUpperCase();
    const qtyToAdd=Number(quantity);

    if(!normalizedItemId||!normalizedSize){
      return res.status(400).json({
        success:false,
        message:"Invalid item ID or size"
      });
    }

    if(!Number.isFinite(qtyToAdd)||qtyToAdd<=0){
      return res.status(400).json({
        success:false,
        message:"Quantity must be greater than 0"
      });
    }

    const userData=await userModel.findById(userId);

    if(!userData){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    const cartData=normalizeCartData(
      JSON.parse(JSON.stringify(userData.cartData||{}))
    );

    if(!cartData[normalizedItemId]){
      cartData[normalizedItemId]={};
    }

    const currentQty=Number(cartData[normalizedItemId][normalizedSize]||0);

    cartData[normalizedItemId][normalizedSize]=currentQty+qtyToAdd;

    userData.cartData=cartData;
    userData.markModified("cartData");

    await userData.save();

    await safeAddLog({
      action:"CART_ADD",
      message:`Added to cart: ${normalizedItemId} (${normalizedSize}) x${qtyToAdd}`,
      user:getActorName(req,"Customer"),
      entityId:normalizedItemId,
      entityType:"Cart"
    });

    return res.status(200).json({
      success:true,
      message:"Added to cart",
      cartData
    });
  }catch(error){
    console.log("ADD TO CART ERROR:",error);

    return res.status(500).json({
      success:false,
      message:error.message||"Failed to add item to cart"
    });
  }
};

const updateCart=async(req,res)=>{
  try{
    const{itemId,productId,size,quantity}=req.body;
    const userId=req.userId;
    const finalItemId=itemId||productId;

    if(!userId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized"
      });
    }

    if(!finalItemId||!size){
      return res.status(400).json({
        success:false,
        message:"Item ID and size required"
      });
    }

    const normalizedItemId=String(finalItemId).trim();
    const normalizedSize=String(size).trim().toUpperCase();
    const nextQty=Number(quantity);

    if(!normalizedItemId||!normalizedSize){
      return res.status(400).json({
        success:false,
        message:"Invalid item ID or size"
      });
    }

    if(!Number.isFinite(nextQty)||nextQty<0){
      return res.status(400).json({
        success:false,
        message:"Quantity must be 0 or greater"
      });
    }

    const userData=await userModel.findById(userId);

    if(!userData){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    const cartData=normalizeCartData(
      JSON.parse(JSON.stringify(userData.cartData||{}))
    );

    console.log("=================================");
    console.log("UPDATE CART");
    console.log("USER:",String(userId));
    console.log("ITEM:",normalizedItemId);
    console.log("SIZE:",normalizedSize);
    console.log("NEW QUANTITY:",nextQty);
    console.log("BEFORE:",JSON.stringify(cartData));
    console.log("=================================");

    if(nextQty===0){
      if(cartData[normalizedItemId]){
        delete cartData[normalizedItemId][normalizedSize];

        if(Object.keys(cartData[normalizedItemId]).length===0){
          delete cartData[normalizedItemId];
        }
      }
    }else{
      if(!cartData[normalizedItemId]){
        cartData[normalizedItemId]={};
      }

      cartData[normalizedItemId][normalizedSize]=nextQty;
    }

    userData.cartData=cartData;
    userData.markModified("cartData");

    await userData.save();

    console.log("CART SAVED:",JSON.stringify(cartData));

    await safeAddLog({
      action:"CART_UPDATED",
      message:`Cart updated: ${normalizedItemId} (${normalizedSize}) → qty ${nextQty}`,
      user:getActorName(req,"Customer"),
      entityId:normalizedItemId,
      entityType:"Cart"
    });

    return res.status(200).json({
      success:true,
      message:"Cart updated",
      cartData
    });
  }catch(error){
    console.log("UPDATE CART ERROR:",error);

    return res.status(500).json({
      success:false,
      message:error.message||"Failed to update cart"
    });
  }
};

const getUserCart=async(req,res)=>{
  try{
    const userId=req.userId;

    if(!userId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized"
      });
    }

    const userData=await userModel.findById(userId);

    if(!userData){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    const cartData=normalizeCartData(
      JSON.parse(JSON.stringify(userData.cartData||{}))
    );

    return res.status(200).json({
      success:true,
      cartData
    });
  }catch(error){
    console.log("GET USER CART ERROR:",error);

    return res.status(500).json({
      success:false,
      message:error.message||"Failed to get cart"
    });
  }
};

const clearCart=async(req,res)=>{
  try{
    const userId=req.userId;

    if(!userId){
      return res.status(401).json({
        success:false,
        message:"Unauthorized"
      });
    }

    const userData=await userModel.findById(userId);

    if(!userData){
      return res.status(404).json({
        success:false,
        message:"User not found"
      });
    }

    userData.cartData={};
    userData.markModified("cartData");

    await userData.save();

    await safeAddLog({
      action:"CART_CLEARED",
      message:"User cleared cart",
      user:getActorName(req,"Customer"),
      entityType:"Cart"
    });

    return res.status(200).json({
      success:true,
      message:"Cart cleared",
      cartData:{}
    });
  }catch(error){
    console.log("CLEAR CART ERROR:",error);

    return res.status(500).json({
      success:false,
      message:error.message||"Failed to clear cart"
    });
  }
};

export{addToCart,updateCart,getUserCart,clearCart};