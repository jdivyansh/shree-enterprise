// Single-view invoice app: clears defaults on focus, auto-calc GST, direct PDF (A4)
document.addEventListener('DOMContentLoaded', ()=>{
  // set today's date
  const d = new Date(); document.getElementById('invoiceDate').valueAsDate = d;

  // clear-on-focus behavior for inputs with data-default
  document.querySelectorAll('input[data-default]').forEach(inp => {
    inp.addEventListener('focus', (e)=>{
      if(e.target.value === e.target.getAttribute('data-default')) e.target.value = '';
    });
    inp.addEventListener('blur', (e)=>{
      if(e.target.value.trim() === '') e.target.value = e.target.getAttribute('data-default') || '';
    });
  });

  // add listeners for dynamic items and calculation
  document.getElementById('addItem').addEventListener('click', addItem);
  document.getElementById('itemsTable').addEventListener('input', recalc);
  document.getElementById('downloadBtn').addEventListener('click', downloadPdf);

  recalc();
});

function addItem(){
  const tbody = document.getElementById('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = '<td class="sl"></td><td><input class="desc" data-default="Sample Item" value="Sample Item"></td><td><input class="hsn" data-default="" value=""></td><td><input class="qty" type="number" data-default="1" value="1" min="0"></td><td><input class="rate" type="number" data-default="0" value="0" min="0"></td><td class="taxable">0.00</td>';
  tbody.appendChild(tr);
  // attach clear-on-focus to new inputs
  tr.querySelectorAll('input[data-default]').forEach(inp=>{
    inp.addEventListener('focus', (e)=>{ if(e.target.value === e.target.getAttribute('data-default')) e.target.value=''; });
    inp.addEventListener('blur', (e)=>{ if(e.target.value.trim()==='') e.target.value = e.target.getAttribute('data-default')||''; });
  });
  recalc();
}

function recalc(){
  let subtotal = 0;
  const rows = document.querySelectorAll('#itemsBody tr');
  rows.forEach((r,i)=>{
    const qty = parseFloat(r.querySelector('.qty')?.value || 0) || 0;
    const rate = parseFloat(r.querySelector('.rate')?.value || 0) || 0;
    const amt = qty * rate;
    r.querySelector('.taxable').textContent = amt.toFixed(2);
    r.querySelector('.sl').textContent = i+1;
    subtotal += amt;
  });
  window.subtotal = subtotal;
  window.cgst = +(subtotal * 0.09);
  window.sgst = +(subtotal * 0.09);
  window.totalTax = +(window.cgst + window.sgst);
  window.grand = +(subtotal + window.totalTax);
  // round off to 2 decimals and compute roundoff
  const roundedGrand = Math.round(window.grand * 100) / 100;
  const roundoff = +(roundedGrand - window.grand).toFixed(2);
  document.getElementById('subtotal').textContent = window.subtotal.toFixed(2);
  document.getElementById('cgst').textContent = window.cgst.toFixed(2);
  document.getElementById('sgst').textContent = window.sgst.toFixed(2);
  document.getElementById('totaltax').textContent = window.totalTax.toFixed(2);
  document.getElementById('roundoff').textContent = roundoff.toFixed(2);
  document.getElementById('grand').textContent = (window.grand + roundoff).toFixed(2);
  // amount in words (simple)
  document.getElementById('inWords').value = toWords(Math.round(window.grand + roundoff)) + ' only';
  return {subtotal:window.subtotal, cgst:window.cgst, sgst:window.sgst, totalTax:window.totalTax, grand:window.grand};
}

function downloadPdf(){
  recalc();
  const el = document.getElementById('invoiceCard');
  const opt = { margin:12, filename:'invoice.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  html2pdf().set(opt).from(el).save();
}

// simple number to words for rupees (handles up to crores)
function toWords(num){
  if(num===0) return 'zero rupees';
  const a=['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const b=['','', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function inWords(n){
    if(n<20) return a[n];
    if(n<100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
    if(n<1000) return a[Math.floor(n/100)] + ' hundred' + (n%100 ? ' and ' + inWords(n%100) : '');
    if(n<100000) return inWords(Math.floor(n/1000)) + ' thousand ' + (n%1000 ? inWords(n%1000) : '');
    if(n<10000000) return inWords(Math.floor(n/100000)) + ' lakh ' + (n%100000 ? inWords(n%100000) : '');
    return inWords(Math.floor(n/10000000)) + ' crore ' + (n%10000000 ? inWords(n%10000000) : '');
  }
  return inWords(num) + ' rupees';
}
