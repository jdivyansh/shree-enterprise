const GST_API = { endpoint: 'https://appyflow.in/api/verifyGST', apiKey: '66LKC7ZBaxNdRXzWirfiurMcxj43', useQuery:true, keyParam:'key' };

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('invoiceDate').valueAsDate = new Date();
  document.getElementById('addItem').addEventListener('click', addRow);
  document.getElementById('previewBtn').addEventListener('click', buildPreview);
  document.getElementById('downloadBtn').addEventListener('click', downloadPdf);
  document.getElementById('buyerGST').addEventListener('blur', onGSTBlur);
  document.querySelector('#itemsTable').addEventListener('input', recalc);
  recalc();
});

function onGSTBlur(e){
  const v = e.target.value.trim();
  if(v.length===15) { fetchGST(v).then(res=>{ if(res){ if(res.tradeName) document.getElementById('buyerName').value=res.tradeName; if(res.address) document.getElementById('buyerAddress').value=res.address; if(res.state) document.getElementById('buyerState').value=res.state; } }); }
}

async function fetchGST(gstin){
  try{
    const url = GST_API.endpoint + '?gstin=' + encodeURIComponent(gstin) + '&' + encodeURIComponent(GST_API.keyParam) + '=' + encodeURIComponent(GST_API.apiKey);
    const r = await fetch(url);
    if(!r.ok) return null;
    const data = await r.json();
    const info = data.taxpayerInfo || data.result || data.data || null;
    if(!info) return null;
    const tradeName = info.tradeNam || info.lgnm || info.legalName || info.tradeName || '';
    let address='';
    try{ const pr = info.pradr || {}; const addr = pr.addr || {}; address = [addr.bno, addr.st, addr.loc, addr.dst, addr.pncd].filter(Boolean).join(', '); }catch(e){ address = info.address || ''; }
    const state = (info.pradr && info.pradr.addr && info.pradr.addr.stcd) || info.state || '';
    return { tradeName, address, state, raw:data };
  }catch(e){ console.error(e); return null; }
}

function addRow(){
  const tbody = document.getElementById('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = '<td class="idx"></td><td><input class="desc"></td><td><input class="hsn"></td><td><input class="qty" type="number" value="1"></td><td><input class="rate" type="number" value="0"></td><td class="amount">0.00</td>';
  tbody.appendChild(tr);
  recalc();
}

function recalc(){
  let subtotal=0;
  const rows = document.querySelectorAll('#itemsBody tr');
  rows.forEach((r,i)=>{
    const qty = parseFloat(r.querySelector('.qty')?.value||0)||0;
    const rate = parseFloat(r.querySelector('.rate')?.value||0)||0;
    const amt = qty*rate;
    r.querySelector('.amount').textContent = amt.toFixed(2);
    r.querySelector('.idx').textContent = i+1;
    subtotal += amt;
  });
  // store totals in hidden fields in preview building step
  window.__subtotal = subtotal;
  window.__cgst = subtotal*0.09;
  window.__sgst = subtotal*0.09;
  window.__grand = subtotal + window.__cgst + window.__sgst;
}

function buildPreview(){
  recalc();
  const invoiceNo = document.getElementById('invoiceNo').value;
  const invoiceDate = document.getElementById('invoiceDate').value;
  const buyerName = document.getElementById('buyerName').value;
  const buyerAddr = document.getElementById('buyerAddress').value;
  const buyerState = document.getElementById('buyerState').value;

  let itemsHtml='';
  document.querySelectorAll('#itemsBody tr').forEach(r=>{
    const desc = r.querySelector('.desc')?.value||'';
    const hsn = r.querySelector('.hsn')?.value||'';
    const qty = r.querySelector('.qty')?.value||'';
    const rate = r.querySelector('.rate')?.value||'';
    const amt = r.querySelector('.amount')?.textContent||'0.00';
    itemsHtml += `<tr><td>${desc}</td><td style="text-align:center">${hsn}</td><td style="text-align:center">${qty}</td><td style="text-align:right">${rate}</td><td style="text-align:right">${amt}</td></tr>`;
  });

  const preview = `
    <div class="inv-print">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><h2>SHRI ENTERPRISE</h2><div style="font-size:13px;color:#445">Shop No. 10-11, Bhagat Complex, Govind Pura, Vatika Road, Sanganer, Jaipur</div></div>
        <div style="text-align:right"><strong>Invoice:</strong> ${invoiceNo}<br><strong>Date:</strong> ${invoiceDate}</div>
      </div>
      <hr style="margin:10px 0;border:none;border-top:1px solid #eee"/>
      <div><strong>Bill To:</strong><br>${buyerName}<br>${buyerAddr}<br>${buyerState}</div>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;border:1px solid #eee">
        <thead><tr style="background:#f7fbff"><th style="padding:8px;">Description</th><th style="padding:8px;">HSN</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right">Rate</th><th style="padding:8px;text-align:right">Amount</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-top:12px;float:right;width:320px;border-top:1px solid #f1f7ff;padding-top:8px">
        <div style="display:flex;justify-content:space-between"><div>Taxable Value</div><div>₹ ${window.__subtotal.toFixed(2)}</div></div>
        <div style="display:flex;justify-content:space-between"><div>CGST @9%</div><div>₹ ${window.__cgst.toFixed(2)}</div></div>
        <div style="display:flex;justify-content:space-between"><div>SGST @9%</div><div>₹ ${window.__sgst.toFixed(2)}</div></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px"><div>Total</div><div>₹ ${window.__grand.toFixed(2)}</div></div>
      </div>
      <div style="clear:both;margin-top:120px">This is a computer generated invoice. Subject to Jodhpur Jurisdiction.</div>
    </div>
  `;

  document.getElementById('invoicePreview').innerHTML = preview;
  // scroll into view
  document.getElementById('invoicePreview').scrollIntoView({behavior:'smooth'});
}

function downloadPdf(){
  const el = document.getElementById('invoicePreview');
  if(!el.innerHTML.trim()){ alert('Please click Preview Invoice first'); return; }
  const opt = { margin:12, filename:'invoice.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  html2pdf().set(opt).from(el).save();
}
