export interface ForecastPoint{period:number;value:number}
export interface ForecastResult{method:"linear_trend"|"moving_average"|"growth_projection";label:"Estimate based on historical data";points:ForecastPoint[]}
const label="Estimate based on historical data" as const;
export function forecast(values:readonly number[],periods:number,method:ForecastResult["method"],window=3):ForecastResult{
  if(values.length===0||periods<1)throw new Error("FORECAST_HISTORY_REQUIRED");
  const points:ForecastPoint[]=[];
  if(method==="linear_trend"){const n=values.length,xMean=(n-1)/2,yMean=values.reduce((a,b)=>a+b,0)/n;let top=0,bottom=0;values.forEach((y,x)=>{top+=(x-xMean)*(y-yMean);bottom+=(x-xMean)**2;});const slope=bottom===0?0:top/bottom;for(let i=0;i<periods;i++)points.push({period:n+i,value:Math.max(0,yMean+slope*(n+i-xMean))});}
  else if(method==="moving_average"){const history=[...values];for(let i=0;i<periods;i++){const slice=history.slice(-window),next=slice.reduce((a,b)=>a+b,0)/slice.length;history.push(next);points.push({period:values.length+i,value:next});}}
  else{const rates=values.slice(1).map((v,i)=>values[i]===0?0:(v-values[i]!)/Math.abs(values[i]!)),rate=rates.length?rates.reduce((a,b)=>a+b,0)/rates.length:0;let next=values.at(-1)!;for(let i=0;i<periods;i++){next=Math.max(0,next*(1+rate));points.push({period:values.length+i,value:next});}}
  return{method,label,points};
}
