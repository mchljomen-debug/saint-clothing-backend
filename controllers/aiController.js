import"dotenv/config";
import{GoogleGenAI,Modality}from"@google/genai";

const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});

const getResponseText=(response)=>{
  if(typeof response?.text==="string")return response.text.trim();
  const candidates=response?.candidates||response?.response?.candidates||[];
  return(candidates?.[0]?.content?.parts||[]).filter((part)=>typeof part?.text==="string").map((part)=>part.text).join("\n").trim();
};

const safeNumber=(value)=>{
  const number=Number(value);
  return Number.isFinite(number)?number:0;
};

export const generateOutfitSuggestion=async(req,res)=>{
  try{
    const{top,bottom,style}=req.body;
    const prompt=`
You are a professional fashion stylist.

Top:
${JSON.stringify(top,null,2)}

Bottom:
${JSON.stringify(bottom,null,2)}

Style:
${style||"modern streetwear"}

Explain why this outfit works in a modern streetwear fashion style.
Keep response short and clean.
`;

    const response=await ai.models.generateContent({
      model:"gemini-2.5-flash",
      contents:prompt,
    });

    return res.json({success:true,suggestion:response.text||""});
  }catch(error){
    console.error("Gemini Text Error:",error);
    return res.status(500).json({success:false,message:error.message||"AI style analysis failed"});
  }
};

export const generateOutfitImage=async(req,res)=>{
  try{
    if(!process.env.GEMINI_API_KEY){
      return res.status(500).json({success:false,message:"GEMINI_API_KEY is missing in Render environment variables."});
    }

    const{top,bottom,mannequin,style}=req.body;

    if(!mannequin?.data){
      return res.status(400).json({success:false,message:"Mannequin image is missing."});
    }

    if(!top?.image?.data&&!bottom?.image?.data){
      return res.status(400).json({success:false,message:"Please select at least one product image."});
    }

    const parts=[
      {
        text:`
Create a realistic full-body fashion e-commerce catalog image.

Main goal:
Make the mannequin naturally wear the selected outfit.

Style direction:
${style||"modern Saint Clothing streetwear"}

Rules:
- Use the mannequin image as the base body and pose.
- Make the selected top look naturally worn on the mannequin.
- Make the selected bottom look naturally worn on the mannequin.
- Preserve the product colors, graphics, logos, texture, and silhouette.
- Centered full-body product catalog photo.
- Clean black studio background.
- No extra models.
- No extra clothes.
- No floating clothes.
- No text.
- No watermark.
`,
      },
      {
        inlineData:{
          mimeType:mannequin.mimeType||"image/png",
          data:mannequin.data,
        },
      },
    ];

    if(top?.image?.data){
      parts.push({
        inlineData:{
          mimeType:top.image.mimeType||"image/png",
          data:top.image.data,
        },
      });
    }

    if(bottom?.image?.data){
      parts.push({
        inlineData:{
          mimeType:bottom.image.mimeType||"image/png",
          data:bottom.image.data,
        },
      });
    }

    const response=await ai.models.generateContent({
      model:"gemini-2.5-flash-image",
      contents:[{role:"user",parts}],
      config:{responseModalities:[Modality.TEXT,Modality.IMAGE]},
    });

    const candidates=response?.candidates||response?.response?.candidates||[];
    const responseParts=candidates?.[0]?.content?.parts||[];
    let image="";

    for(const part of responseParts){
      if(part.inlineData?.data){
        image=`data:${part.inlineData.mimeType||"image/png"};base64,${part.inlineData.data}`;
        break;
      }
    }

    if(!image){
      return res.status(500).json({success:false,message:"Gemini did not return an image. Your API key may not support image generation."});
    }

    return res.json({success:true,image});
  }catch(error){
    console.error("Gemini Image Error:",error);
    return res.status(500).json({
      success:false,
      message:error.message||"AI image generation failed",
      details:error.response?.data||null,
    });
  }
};

export const generateSalesInsight=async(req,res)=>{
  try{
    if(!process.env.GEMINI_API_KEY){
      return res.status(500).json({success:false,message:"GEMINI_API_KEY is missing."});
    }

    const{overview,productPerformance,categoryPerformance,lowStockProducts,salesTrend}=req.body||{};

    if(!overview){
      return res.status(400).json({success:false,message:"Sales overview is required."});
    }

    const data={
      overview:{
        totalRevenue:safeNumber(overview.totalRevenue),
        totalOrders:safeNumber(overview.totalOrders),
        totalUnitsSold:safeNumber(overview.totalUnitsSold),
        netProfit:safeNumber(overview.netProfit),
        netProfitMargin:safeNumber(overview.netProfitMargin),
        totalProducts:safeNumber(overview.totalProducts),
        lowStockCount:safeNumber(overview.lowStockCount),
      },
      productPerformance:Array.isArray(productPerformance)?productPerformance.slice(0,40):[],
      categoryPerformance:Array.isArray(categoryPerformance)?categoryPerformance:[],
      lowStockProducts:Array.isArray(lowStockProducts)?lowStockProducts.slice(0,20):[],
      salesTrend:salesTrend||{},
    };

    const prompt=`
You are the sales analyst for Saint Clothing.

Analyze ONLY this supplied sales report data.

${JSON.stringify(data,null,2)}

Write one concise professional Sales Insight for an administrative sales report.

The text should:
- summarize overall performance
- identify the strongest product when sales data supports it
- identify the strongest category when supported
- mention products with zero or weak sales only when useful
- mention important low-stock risks
- provide one or two practical recommendations
- use exact supplied figures where useful
- never invent causes, sales, customers, percentages, forecasts or products
- if there is insufficient sales data, clearly say so
- do not mention Gemini
- do not mention AI
- do not use a heading
- do not use bullet points
- return only the insight paragraph
- keep it around 90 to 150 words
`;

    const response=await ai.models.generateContent({
      model:"gemini-2.5-flash",
      contents:prompt,
    });

    const insight=getResponseText(response);

    if(!insight){
      return res.status(500).json({success:false,message:"No sales insight was returned."});
    }

    return res.json({
      success:true,
      insight,
      generatedAt:new Date().toISOString(),
    });
  }catch(error){
    console.error("Sales Insight Error:",error);
    return res.status(500).json({
      success:false,
      message:error.message||"Sales insight generation failed",
      details:error.response?.data||null,
    });
  }
};