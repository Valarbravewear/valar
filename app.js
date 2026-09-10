let products = [];
let cart = JSON.parse(localStorage.getItem("valarCart") || "[]");
let selectedCategory = "All";

const fallbackProducts = [
 {id:"demo-1",name:"VALAR Signature Tee",category:"T-Shirts",description:"VALAR signature streetwear tee.",price:18500,stock:10,image_url:"",sizes:["S","M","L","XL"],colors:["Black"],active:true},
 {id:"demo-2",name:"Brave & Wear Tee",category:"T-Shirts",description:"Bold everyday VALAR tee.",price:18000,stock:10,image_url:"",sizes:["S","M","L","XL"],colors:["White"],active:true},
 {id:"demo-3",name:"VALAR Essential Hoodie",category:"Hoodies",description:"Heavy everyday hoodie.",price:35000,stock:5,image_url:"",sizes:["M","L","XL"],colors:["Black"],active:true},
 {id:"demo-4",name:"VALAR Street Cap",category:"Caps",description:"Classic VALAR cap.",price:15000,stock:8,image_url:"",sizes:["One size"],colors:["Black"],active:true}
];

const money = n => "MWK " + Number(n || 0).toLocaleString("en-US");

async function loadProducts(){
  if(window.valarSupabase){
    const {data,error}=await window.valarSupabase.from("products").select("*").eq("active",true).order("created_at",{ascending:false});
    if(!error && data && data.length){ products=data; }
    else { products=fallbackProducts; }
  } else { products=fallbackProducts; }
  renderFilters(); renderProducts(); renderCart();
}

function renderFilters(){
  const cats=["All",...new Set(products.map(p=>p.category))];
  document.getElementById("filters").innerHTML=cats.map(c=>`<button class="filter ${c===selectedCategory?"active":""}" data-category="${c}">${c}</button>`).join("");
  document.querySelectorAll(".filter").forEach(btn=>btn.onclick=()=>{
    selectedCategory=btn.dataset.category; renderFilters(); renderProducts();
  });
}

function renderProducts(){
  const list=selectedCategory==="All"?products:products.filter(p=>p.category===selectedCategory);
  const grid=document.getElementById("productGrid");
  if(!list.length){grid.innerHTML='<div class="loading">No products available right now.</div>';return;}
  grid.innerHTML=list.map(p=>`
    <article class="product-card">
      <div class="product-photo">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}">`:`<div class="placeholder">${escapeHtml((p.name||"VALAR").split(" ")[0])}</div>`}</div>
      <div class="product-info">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="product-meta"><span>${escapeHtml(p.category)}</span><strong class="price">${money(p.price)}</strong></div>
        <button class="add" ${Number(p.stock)<=0?"disabled":""} onclick="addToCart('${p.id}')">${Number(p.stock)<=0?"SOLD OUT":"ADD TO CART"}</button>
      </div>
    </article>`).join("");
}

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function addToCart(id){
  const p=products.find(x=>String(x.id)===String(id)); if(!p)return;
  const item=cart.find(x=>String(x.id)===String(id));
  if(item){ if(item.qty < Number(p.stock)) item.qty++; }
  else cart.push({id:p.id,qty:1,size:(p.sizes||[])[0]||"",color:(p.colors||[])[0]||""});
  saveCart(); openCart();
}

function saveCart(){localStorage.setItem("valarCart",JSON.stringify(cart));renderCart();}
function removeFromCart(id){cart=cart.filter(x=>String(x.id)!==String(id));saveCart();}
function changeQty(id,d){
  const item=cart.find(x=>String(x.id)===String(id)); const p=products.find(x=>String(x.id)===String(id)); if(!item||!p)return;
  item.qty+=d; if(item.qty<=0)removeFromCart(id); else if(item.qty<=Number(p.stock))saveCart();
}

function cartTotal(){return cart.reduce((sum,x)=>{const p=products.find(p=>String(p.id)===String(x.id));return sum+(p?Number(p.price)*x.qty:0)},0);}

function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0); document.getElementById("cartCount").textContent=count;
  document.getElementById("cartTotal").textContent=money(cartTotal());document.getElementById("checkoutTotal").textContent=money(cartTotal());
  const wrap=document.getElementById("cartItems");
  if(!cart.length){wrap.innerHTML='<div class="empty">Your cart is empty.</div>';return;}
  wrap.innerHTML=cart.map(x=>{const p=products.find(p=>String(p.id)===String(x.id));if(!p)return "";
    return `<div class="cart-item"><div class="mini-photo">${p.image_url?`<img src="${escapeHtml(p.image_url)}" alt="">`:escapeHtml((p.name||"V").slice(0,1))}</div>
    <div><h4>${escapeHtml(p.name)}</h4><small>${money(p.price)} × ${x.qty}</small><br><button class="remove" onclick="removeFromCart('${p.id}')">Remove</button></div>
    <div class="qty"><button onclick="changeQty('${p.id}',-1)">−</button> <strong>${x.qty}</strong> <button onclick="changeQty('${p.id}',1)">+</button></div></div>`;
  }).join("");
}

function openCart(){document.getElementById("cartDrawer").classList.add("show");document.getElementById("drawerBackdrop").classList.add("show");}
function closeCart(){document.getElementById("cartDrawer").classList.remove("show");document.getElementById("drawerBackdrop").classList.remove("show");}
document.getElementById("openCart").onclick=openCart;document.getElementById("closeCart").onclick=closeCart;document.getElementById("drawerBackdrop").onclick=closeCart;

document.getElementById("checkoutButton").onclick=()=>{
  if(!cart.length){alert("Your cart is empty.");return;}
  document.getElementById("checkoutBackdrop").classList.add("show");
};
document.getElementById("closeCheckout").onclick=()=>document.getElementById("checkoutBackdrop").classList.remove("show");

document.getElementById("checkoutForm").onsubmit=async e=>{
  e.preventDefault();
  if(!window.valarSupabase){alert("Connect the VALAR Supabase project in config.js first.");return;}
  const data=new FormData(e.target);
  const orderNumber="VALAR-"+Date.now().toString().slice(-8);
  const total=cartTotal();
  const order={order_number:orderNumber,customer_name:data.get("name"),phone:data.get("phone"),delivery_location:data.get("location"),payment_method:data.get("payment"),payment_status:data.get("payment")==="Cash on delivery / pickup"?"cash_pending":"pending",total};
  const {data:created,error}=await window.valarSupabase.from("orders").insert(order).select().single();
  if(error){alert("We could not place the order. Please try again.");console.error(error);return;}
  const rows=cart.map(x=>{const p=products.find(p=>String(p.id)===String(x.id));return {order_id:created.id,product_id:p.id,product_name:p.name,quantity:x.qty,unit_price:p.price,size:x.size||"",color:x.color||"",line_total:Number(p.price)*x.qty};});
  const {error:itemError}=await window.valarSupabase.from("order_items").insert(rows);
  if(itemError){console.error(itemError);alert("The order was created, but its item details need attention. Contact VALAR.");return;}
  document.getElementById("orderResult").innerHTML=`<strong>Order ${orderNumber} received.</strong><br>Keep this number for reference.`;
  cart=[];saveCart();e.target.reset();
};

document.getElementById("year").textContent=new Date().getFullYear();
loadProducts();
