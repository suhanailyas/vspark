var API_URL="/api/registrations"; // Set to your registration endpoint (e.g. https://your-api.com/api/registrations)
var $=function(s){return document.querySelector(s)};
$("#mb").onclick=function(){var o=$("#lk").classList.toggle("o");this.setAttribute("aria-expanded",o)};
document.querySelectorAll("#lk a").forEach(function(a){a.onclick=function(){$("#lk").classList.remove("o")}});
var io=new IntersectionObserver(function(e){e.forEach(function(x){if(x.isIntersecting)x.target.classList.add("in")})},{threshold:.08});
document.querySelectorAll(".rv").forEach(function(e){io.observe(e)});
var MAX=5*1024*1024,OK=["image/jpeg","image/png","application/pdf"],pu=null;
function err(el,m){var g=el.parentNode;g.classList.toggle("bad",!!m);g.querySelector(".er").textContent=m||""}
$("#rc").onchange=function(){var f=this.files[0],pv=$("#pv");pv.style.display="none";$("#pn").textContent="";if(pu){URL.revokeObjectURL(pu);pu=null}
if(!f){return}
if(OK.indexOf(f.type)<0){err(this,"Only JPG, PNG or PDF files are allowed.");this.value="";return}
if(f.size>MAX){err(this,"File is too large. Maximum size is 5 MB.");this.value="";return}
err(this,"");$("#pn").textContent=f.name+" ("+Math.round(f.size/1024)+" KB)";
if(f.type!=="application/pdf"){pu=URL.createObjectURL(f);pv.src=pu;pv.style.display="block"}};
function validate(){var bad=0,v=function(id,test,msg){var el=$(id),ok=test(el.value.trim());err(el,ok?"":msg);if(!ok)bad++};
var req=function(x){return x.length>1};
v("#name",function(x){return x.length>=3},"Please enter your full name.");
v("#email",function(x){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x)},"Enter a valid email address.");
v("#phone",function(x){return /^(\+92|0)?3\d{9}$/.test(x.replace(/[\s-]/g,""))},"Enter a valid Pakistani mobile number, e.g. 03XXXXXXXXX.");
v("#uni",req,"University name is required.");v("#dept",req,"Department is required.");
v("#sem",function(x){return !!x},"Please select your semester.");
v("#tx",function(x){return x.length>=4},"Enter the transaction ID from your payment.");
var f=$("#rc").files[0];if(!f){err($("#rc"),"Please upload your payment receipt.");bad++}
return !bad}
$("#f").onsubmit=function(e){e.preventDefault();var a=$("#alert");a.style.display="none";
if(!validate()){var b=document.querySelector(".bad input,.bad select");if(b)b.focus();return}
if(!API_URL){a.textContent="Registration can’t be completed yet: the backend isn’t connected. Your details were not saved.";a.style.display="block";return}
var sb=$("#sb");sb.disabled=true;sb.textContent="Submitting…";
fetch(API_URL,{method:"POST",body:new FormData(this),headers:{Accept:"application/json"}})
.then(function(r){return r.json().then(function(d){if(!r.ok||!d.reference){var x=new Error(d.message||"Server error");x.fields=d.errors;throw x}return d})})
.then(function(d){$("#f").style.display="none";$("#ok").style.display="block";$("#ref").textContent=d.reference;$("#ok").scrollIntoView({behavior:"smooth",block:"center"})})
.catch(function(x){if(x.fields){var m={full_name:"#name",email:"#email",phone:"#phone",university:"#uni",department:"#dept",semester:"#sem",transaction_id:"#tx",receipt:"#rc"};for(var k in x.fields)if(m[k])err($(m[k]),x.fields[k])}a.textContent="Submission failed: "+(x.message||"network error")+". Please try again.";a.style.display="block"})
.finally(function(){sb.disabled=false;sb.textContent="Submit registration"})};
/* vs-nav */
var nv=$("#nav"),sc=function(){nv.classList.toggle("sc",window.scrollY>40)};window.addEventListener("scroll",sc,{passive:true});sc();
