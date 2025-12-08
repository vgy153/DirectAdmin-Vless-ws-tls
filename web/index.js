process.on("uncaughtException",()=>{});process.on("unhandledRejection",()=>{});

const UUID   = (process.env.UUID   ?? "0cbbd5b1-2ba6-405f-b71d-03c92cb7b6e8").trim();
const DOMAIN = (process.env.DOMAIN ?? "demo.example.com").trim();
const PORT   = Number(process.env.PORT) || 0;

const http = require("http");
const net  = require("net");
const ws   = require("ws");

const ADDR = ["www.visa.cn","usa.visa.com","time.is","www.wto.org"];
const hex  = UUID.replace(/-/g,"");
let c = 0;

const server = http.createServer((q,r)=>{
  q.url===`/${UUID}` ? r.end(ADDR.map(a=>`vless://${UUID}@${a}:443?encryption=none&security=tls&sni=${DOMAIN}&fp=chrome&type=ws&host=${DOMAIN}&path=%2F#DA-${a}`).join("\n")+"\n") : r.end("OK");
});

new ws.Server({server}).on("connection",s=>{
  if(c++>14){s.close(1008);return}
  s.on("close",()=>{c--;r?.destroy()});
  let r;
  s.once("message",m=>{
    try{
      if(m.length<34)return s.close();  // 最小握手包长度检查
      for(let i=0;i<16;i++)if(m[1+i]!==parseInt(hex.substr(i*2,2),16))return s.close();
      let p=17;
      const port=m.readUInt16BE(p);p+=2;
      if(m[p++]!==1||m.length<p+4)return s.close();
      const b1=m[p++],b2=m[p++],b3=m[p++],b4=m[p++];  // 临时变量防错位
      const ip=`${b1}.${b2}.${b3}.${b4}`;
      console.log(`VLESS handshake OK: ${ip}:${port}`);  // 调试日志
      s.send(new Uint8Array([m[0],0]));
      r=net.connect(port,ip,()=>{r.write(m.slice(p))});
      s.on("message",d=>r.write(d));
      r.on("data",d=>s.send(d));
      r.on("end",()=>s.close());
      r.on("error",()=>s.close());
      s.on("close",()=>r?.destroy());
    }catch{s.close()}
  });
});

server.listen(PORT,"127.0.0.1",()=>{
  console.log(`VLESS OK → 127.0.0.1:${server.address().port}`);
});
