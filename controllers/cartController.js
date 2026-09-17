import userModel from"../models/userModel.js";
import productModel from"../models/productModel.js";
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

const normalizeStockObject=stock=>{
if(!stock)return{};

if(stock instanceof Map){
return Object.fromEntries(
Array.from(stock.entries()).map(([size,qty])=>[
String(size).trim().toUpperCase(),
Number(qty)||0
])
);
}

if(typeof stock==="object"&&!Array.isArray(stock)){
const normalized={};

for(const[size,qty]of Object.entries(stock)){
normalized[String(size).trim().toUpperCase()]=Number(qty)||0;
}

return normalized;
}

return{};
};

const getAvailableStockForSize=(product,size)=>{
const normalizedSize=String(size||"").trim().toUpperCase();
const stock=normalizeStockObject(product?.stock);
const preorderStock=normalizeStockObject(product?.preorderStock);

const actualStock=Number(stock[normalizedSize]||0);
const availablePreorderStock=Number(preorderStock[normalizedSize]||0);
const preorderEnabled=product?.preorderEnabled!==false;
const preorderThreshold=Number(product?.preorderThreshold??5);

const isPreorderSize=
preorderEnabled&&
actualStock<=preorderThreshold&&
availablePreorderStock>0;

return{
availableStock:isPreorderSize?availablePreorderStock:actualStock,
isPreorderSize,
actualStock,
preorderStock:availablePreorderStock,
preorderEnabled,
preorderThreshold
};
};

const getProductSizes=product=>{
const sizes=new Set();

if(Array.isArray(product?.sizes)){
for(const entry of product.sizes){
if(typeof entry==="string"){
const size=entry.trim().toUpperCase();
if(size)sizes.add(size);
continue;
}

if(entry&&typeof entry==="object"){
const size=String(entry.size||entry.name||entry.label||"").trim().toUpperCase();
if(size)sizes.add(size);
}
}
}

const stock=normalizeStockObject(product?.stock);
const preorderStock=normalizeStockObject(product?.preorderStock);

Object.keys(stock).forEach(size=>sizes.add(size));
Object.keys(preorderStock).forEach(size=>sizes.add(size));

return Array.from(sizes);
};

const validateProductForCart=async(itemId,size,quantity,currentQuantity=0)=>{
const product=await productModel.findById(itemId);

if(!product){
return{
success:false,
status:404,
message:"Product not found"
};
}

if(product.isDeleted){
return{
success:false,
status:400,
message:"This product is no longer available"
};
}

const normalizedSize=String(size).trim().toUpperCase();
const availableSizes=getProductSizes(product);

if(availableSizes.length>0&&!availableSizes.includes(normalizedSize)){
return{
success:false,
status:400,
message:`Size ${normalizedSize} is not available for this product`
};
}

const{
availableStock,
isPreorderSize,
actualStock,
preorderStock
}=getAvailableStockForSize(product,normalizedSize);

if(availableStock<=0){
return{
success:false,
status:400,
message:isPreorderSize
?"No pre-order slots are available for this size"
:"This size is currently out of stock"
};
}

const requestedTotal=Number(currentQuantity||0)+Number(quantity||0);

if(requestedTotal>availableStock){
return{
success:false,
status:400,
message:isPreorderSize
?`Only ${availableStock} pre-order slot${availableStock===1?"":"s"} available for size ${normalizedSize}`
:`Only ${availableStock} item${availableStock===1?"":"s"} available for size ${normalizedSize}`
};
}

return{
success:true,
product,
availableStock,
isPreorderSize,
actualStock,
preorderStock
};
};

const safeAddLog=async data=>{
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

if(!Number.isInteger(qtyToAdd)||qtyToAdd<=0){
return res.status(400).json({
success:false,
message:"Quantity must be a positive whole number"
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

const currentQty=Number(
cartData[normalizedItemId]?.[normalizedSize]||0
);

const validation=await validateProductForCart(
normalizedItemId,
normalizedSize,
qtyToAdd,
currentQty
);

if(!validation.success){
return res.status(validation.status).json({
success:false,
message:validation.message
});
}

if(!cartData[normalizedItemId]){
cartData[normalizedItemId]={};
}

cartData[normalizedItemId][normalizedSize]=currentQty+qtyToAdd;

userData.cartData=cartData;
userData.markModified("cartData");

await userData.save();

await safeAddLog({
action:"CART_ADD",
message:`Added to cart: ${validation.product.name||normalizedItemId} (${normalizedSize}) x${qtyToAdd}`,
user:getActorName(req,"Customer"),
entityId:normalizedItemId,
entityType:"Cart"
});

return res.status(200).json({
success:true,
message:validation.isPreorderSize?"Pre-order added to cart":"Added to cart",
cartData,
item:{
itemId:normalizedItemId,
size:normalizedSize,
quantity:cartData[normalizedItemId][normalizedSize],
isPreorder:validation.isPreorderSize,
availableStock:validation.availableStock
}
});
}catch(error){
console.log("ADD TO CART ERROR:",error);

if(error?.name==="CastError"){
return res.status(400).json({
success:false,
message:"Invalid product ID"
});
}

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

if(!Number.isInteger(nextQty)||nextQty<0){
return res.status(400).json({
success:false,
message:"Quantity must be 0 or a positive whole number"
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

if(nextQty>0){
const validation=await validateProductForCart(
normalizedItemId,
normalizedSize,
nextQty,
0
);

if(!validation.success){
return res.status(validation.status).json({
success:false,
message:validation.message
});
}
}

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

if(error?.name==="CastError"){
return res.status(400).json({
success:false,
message:"Invalid product ID"
});
}

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