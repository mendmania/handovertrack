// Deliberately separate from the manager proxy: NEVER forward cookies or Referer.
export const dynamic='force-dynamic';
const privateHeaders={'cache-control':'private, no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'};
async function handler(request:Request,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params,resource=path.join('/');
 if(!(request.method==='POST'?/^[a-f0-9-]{36}\/decisions$/:/^[a-f0-9-]{36}(\/pdf)?$/).test(resource))return new Response(null,{status:404,headers:privateHeaders});
 if(request.method==='POST'&&request.headers.get('origin')!==process.env.WEB_ORIGIN)return new Response(null,{status:403,headers:privateHeaders});
 if(new URL(request.url).search)return new Response(null,{status:400,headers:privateHeaders});
 const headers=new Headers();
 for(const key of ['authorization','content-type','origin','idempotency-key']){const v=request.headers.get(key);if(v)headers.set(key,v);}
 try{
  // Bound JSON before forwarding, including chunked requests without Content-Length.
  let body:Uint8Array|undefined;
  if(request.method==='POST'){
   const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400,headers:privateHeaders});
   const chunks:Uint8Array[]=[];let length=0;
   for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>16384){await reader.cancel();return new Response(null,{status:413,headers:privateHeaders});}chunks.push(r.value);}
   body=new Uint8Array(length);let i=0;for(const chunk of chunks){body.set(chunk,i);i+=chunk.length;}
  }
  const upstream=await fetch(new URL('/guest/v1/shares/'+resource,process.env.API_INTERNAL_URL??'http://127.0.0.1:3301'),{method:request.method,headers,cache:'no-store',redirect:'error',signal:request.signal,...(body?{body:body as BodyInit}:{})});
  const outgoing=new Headers(privateHeaders);for(const key of ['content-type','content-disposition']){const v=upstream.headers.get(key);if(v)outgoing.set(key,v);}
  return new Response(upstream.body,{status:upstream.status,headers:outgoing});
 }catch{return Response.json({code:'UPSTREAM_UNAVAILABLE'},{status:502,headers:privateHeaders});}
}
export {handler as GET,handler as POST};
