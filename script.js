// Auto-calc GST invoice + preview + PDF
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('invoiceDate').valueAsDate = new Date();
  document.getElementById('addItem').addEventListener('click', addItem);
  document.getElementById('previewBtn').addEventListener('click', buildPreview);
  document.getElementById('downloadBtn').addEventListener('click', downloadPdf);
  document.getElementById('itemsTable').addEventListener('input', recalc);
  recalc();
});

function addItem(){
  const tbody = document.getElementById('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = '<td class="idx"></td><td><input class="desc" placeholder="Description"></td><td><input class="hsn" placeholder=""></td><td><input class="qty" type="number" value="1"></td><td><input class="rate" type="number" value="0"></td><td class="taxable">0.00</td>';
  tbody.appendChild(tr);
  recalc();
}

function recalc(){
  let subtotal = 0;
  const rows = document.querySelectorAll('#itemsBody tr');
  rows.forEach((r,i)=>{
    const qty = parseFloat(r.querySelector('.qty')?.value||0)||0;
    const rate = parseFloat(r.querySelector('.rate')?.value||0)||0;
    const amt = qty*rate;
    r.querySelector('.taxable').textContent = amt.toFixed(2);
    r.querySelector('.idx').textContent = i+1;
    subtotal += amt;
  });
  window.__subtotal = subtotal;
  window.__cgst = subtotal * 0.09;
  window.__sgst = subtotal * 0.09;
  window.__totalTax = window.__cgst + window.__sgst;
  window.__grand = subtotal + window.__totalTax;
  return {subtotal: window.__subtotal, cgst: window.__cgst, sgst: window.__sgst, grand: window.__grand};
}

function buildPreview(){
  recalc();
  const invNo = document.getElementById('invoiceNo').value;
  const invDate = document.getElementById('invoiceDate').value;
  const buyerName = document.getElementById('buyerName').value || '---';
  const buyerGST = document.getElementById('buyerGST').value || '---';
  const buyerAddr = document.getElementById('buyerAddress').value || '---';
  const buyerState = document.getElementById('buyerState').value || '---';

  let rowsHtml='';
  document.querySelectorAll('#itemsBody tr').forEach(r=>{
    const desc = r.querySelector('.desc')?.value||'';
    const hsn = r.querySelector('.hsn')?.value||'';
    const qty = r.querySelector('.qty')?.value||'';
    const rate = r.querySelector('.rate')?.value||'';
    const amt = r.querySelector('.taxable')?.textContent||'0.00';
    rowsHtml += `<tr><td style="padding:6px">${desc}</td><td style="padding:6px;text-align:center">${hsn}</td><td style="padding:6px;text-align:center">${qty}</td><td style="padding:6px;text-align:right">${rate}</td><td style="padding:6px;text-align:right">${amt}</td></tr>`;
  });

  const preview = `
  <div class="invoice-print" style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div style="max-width:60%">
        <strong>SHRI ENTERPRISES</strong><br>
        Shop No. 10-11, Bhagat Complex, Govind Pura, Vatika Road, Sanganer, Jaipur<br>
        GSTIN: 08AAQPJ4289C2ZE<br>
        Phone: 9829165560, 8949085260
      </div>
      <div style="text-align:right">
        <div><strong>Invoice No:</strong> ${invNo}</div>
        <div><strong>Date:</strong> ${invDate}</div>
      </div>
    </div>

    <hr style="margin:10px 0;border:none;border-top:1px solid #ddd"/>

    <div><strong>Bill To:</strong><br>${buyerName}<br>${buyerAddr}<br>GSTIN: ${buyerGST}<br>State: ${buyerState}</div>

    <table style="width:100%;border-collapse:collapse;margin-top:12px;border:1px solid #eee">
      <thead style="background:#f7fbff;color:#1f4e79"><tr><th style="padding:8px">Description</th><th style="padding:8px">HSN/SAC</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Rate</th><th style="padding:8px;text-align:right">Taxable Value</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>

    <div style="margin-top:12px;float:right;width:360px;border-top:1px solid #f1f7ff;padding-top:8px">
      <div style="display:flex;justify-content:space-between"><div>Taxable Value</div><div>₹ ${window.__subtotal.toFixed(2)}</div></div>
      <div style="display:flex;justify-content:space-between"><div>CGST @9%</div><div>₹ ${window.__cgst.toFixed(2)}</div></div>
      <div style="display:flex;justify-content:space-between"><div>SGST @9%</div><div>₹ ${window.__sgst.toFixed(2)}</div></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:6px"><div>Total</div><div>₹ ${window.__grand.toFixed(2)}</div></div>
    </div>

    <div style="clear:both;margin-top:120px;font-size:13px;color:#555">Declaration: We declare that this invoice shows in actual price of the goods described and that all particulars are true and correct.</div>

    <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong>Bank Details:</strong><br>
        UJJIVAN SMALL FINANCE BANK<br>
        Branch: Sanganer, Tonk Road, Jaipur<br>
        A/C No.: 2338120020000208<br>
        IFSC: UJVN0002338
      </div>
      <div style="text-align:center">
        <div>For: SHRI ENTERPRISES</div>
        <div style="margin-top:60px">Authorised Signatory</div>
      </div>
    </div>
  </div>
  `;

  document.getElementById('previewArea').innerHTML = preview;
  window.scrollTo({top: document.getElementById('previewArea').offsetTop-10, behavior:'smooth'});
}

function downloadPdf(){
  const el = document.getElementById('previewArea');
  if(!el.innerHTML.trim()){ alert('Please click Preview Invoice first'); return; }
  const opt = { margin:12, filename:'invoice.pdf', image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2,useCORS:true}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'} };
  html2pdf().set(opt).from(el).save();
}
