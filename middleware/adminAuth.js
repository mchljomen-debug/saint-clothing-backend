import jwt from"jsonwebtoken";

const adminAuth=(req,res,next)=>{
  try{
    const authHeader=req.headers.authorization;

    const tokenFromHeader=
      authHeader&&authHeader.startsWith("Bearer ")
        ?authHeader.slice(7).trim()
        :null;

    const token=tokenFromHeader||req.headers.token;

    if(!token){
      return res.status(401).json({
        success:false,
        message:"No token"
      });
    }

    if(!process.env.JWT_SECRET){
      console.error("JWT_SECRET is missing");

      return res.status(500).json({
        success:false,
        message:"Server authentication configuration error"
      });
    }

    const decoded=jwt.verify(token,process.env.JWT_SECRET);

    if(!decoded||typeof decoded!=="object"||!decoded.role){
      return res.status(401).json({
        success:false,
        message:"Invalid token payload"
      });
    }

    if(!["admin","manager","staff"].includes(decoded.role)){
      return res.status(403).json({
        success:false,
        message:"Access denied"
      });
    }

    if(decoded.role!=="admin"&&!decoded.branch){
      return res.status(403).json({
        success:false,
        message:"No branch assigned to this account"
      });
    }

    req.user=decoded;
    next();
  }catch(err){
    console.log("JWT ERROR:",err);

    if(err.name==="TokenExpiredError"){
      return res.status(401).json({
        success:false,
        message:"Session expired. Please login again."
      });
    }

    return res.status(401).json({
      success:false,
      message:"Invalid token"
    });
  }
};

export default adminAuth;