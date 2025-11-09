// AppyFlow GST configuration (key embedded)
const GST_API = {
  endpoint: 'https://appyflow.in/api/verifyGST',
  apiKey: '66LKC7ZBaxNdRXzWirfiurMcxj43',
  useQuery: true,
  keyParam: 'key'
};

function showStatus(msg, ok) {
  const el = document.getElementById('gstStatus');
  el.textContent = msg;
  el.style.color = ok ? 'green' : 'crimson';
}

async function fetchGST(gstin) {
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) { showStatus('GSTIN must be 15 characters', false); return null; }
  showStatus('Looking up GSTIN...', true);
  try {
    let url = GST_API.endpoint + '?gstin=' + encodeURIComponent(clean);
    if (GST_API.useQuery && GST_API.apiKey) {
      url += '&' + encodeURIComponent(GST_API.keyParam) + '=' + encodeURIComponent(GST_API.apiKey);
    }
    const res = await fetch(url);
    if (!res.ok) { showStatus('GST lookup failed: ' + res.statusText, false); return null; }
    const data = await res.json();
    const info = data.taxpayerInfo || data.result || data.data || null;
    if (!info) {
      showStatus('Unexpected GST response format', false);
      return null;
    }
    const tradeName = info.tradeNam || info.lgnm || info.legalName || info.legalname || info.tradeName || '';
    let address = '';
    try {
      const pradr = info.pradr || info.princple || info.principalPlace || info.principalPlaceOfBusiness || {};
      const addr = pradr.addr || pradr.address || {};
      address = [addr.bno, addr.st, addr.loc, addr.dst, addr.pncd].filter(Boolean).join(', ');
    } catch (e) {
      address = info.address || info.address_line || '';
    }
    const state = (info.pradr && info.pradr.addr && info.pradr.addr.stcd) || info.state || '';
    showStatus('Fetched from GST portal', true);
    return { tradeName, address, state, raw: data };
  } catch (e) {
    console.error(e);
    showStatus('GST lookup error: ' + e.message, false);
    return null;
  }
}

// amount to words (Indian)
function amountToWords(amount) {
  const oneToNineteen = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tensNames = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  function twoDigit(n){ if (n<20) return oneToNineteen[n]; return tensNames[Math.floor(n/10)] + (n%10 ? ' ' + oneToNineteen[n%10] : ''); }
  function threeDigit(n){ let s=''; if(n>99){ s += oneToNineteen[Math.floor(n/100)] + ' hundred'; if(n%100) s += ' and '; } if(n%100) s += twoDigit(n%100); return s; }
  function inWords(n){ let res=''; if(n>=10000000){ res += inWords(Math.floor(n/10000000)) + ' crore '; n = n%10000000; } if(n>=100000){ res += inWords(Math.floor(n/100000)) + ' lakh '; n = n%100000; } if(n>=1000){ res += inWords(Math.floor(n/1000)) + ' thousand '; n = n%1000; } if(n>0){ res += threeDigit(n); } return res.trim(); }
  let rupees = Math.floor(amount);
  let paise = Math.round((amount-rupees)*100);
  let words = '';
  if (rupees>0) words += inWords(rupees) + ' rupees';
  if (paise>0) words += (words ? ' and ' : '') + inWords(paise) + ' paise';
  if (!words) words = 'zero rupees';
  return words + ' only';
}

document.addEventListener('DOMContentLoaded', () => {
  const itemsBody = document.getElementById('itemsBody');
  const addItemBtn = document.getElementById('addItem');
  const generatePdfBtn = document.getElementById('generatePdf');
  const whatsappBtn = document.getElementById('whatsappBtn');
  const resetBtn = document.getElementById('resetBtn');
  const taxableEl = document.getElementById('taxable');
  const cgstEl = document.getElementById('cgst');
  const sgstEl = document.getElementById('sgst');
  const grandEl = document.getElementById('grandTotal');
  const inWordsEl = document.getElementById('inWords');
  const buyerGST = document.getElementById('buyerGST');
  const buyerName = document.getElementById('buyerName');
  const buyerAddress = document.getElementById('buyerAddress');
  const buyerState = document.getElementById('buyerState');
  const buyerWhats = document.getElementById('buyerWhats');
  const invoiceBox = document.getElementById('invoiceBox');

  // set today's date
  document.getElementById('invoiceDate').valueAsDate = new Date();

  // auto-clear on focus (clear prefilled)
  document.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('focus', (e) => { e.target.dataset.prefilled = e.target.value; e.target.value = ''; });
    inp.addEventListener('blur', (e) => { if(e.target.value==='') e.target.value = e.target.dataset.prefilled || ''; });
  });

  function recalc() {
    let taxable = 0;
    const rows = Array.from(itemsBody.querySelectorAll('tr'));
    rows.forEach((row, idx) => {
      const idxCell = row.querySelector('.idx');
      if (idxCell) idxCell.textContent = idx+1;
      const qty = parseFloat(row.querySelector('.qty').value) || 0;
      const rate = parseFloat(row.querySelector('.rate').value) || 0;
      const amount = qty * rate;
      row.querySelector('.amount').textContent = amount.toFixed(2);
      taxable += amount;
    });
    const cgst = taxable * 0.09;
    const sgst = taxable * 0.09;
    const grand = taxable + cgst + sgst;
    taxableEl.textContent = taxable.toFixed(2);
    cgstEl.textContent = cgst.toFixed(2);
    sgstEl.textContent = sgst.toFixed(2);
    grandEl.textContent = grand.toFixed(2);
    inWordsEl.textContent = amountToWords(grand);
  }

  recalc();

  addItemBtn.addEventListener('click', () => {
    const tr = document.createElement('tr');
    let inner = '';
    inner += '<td class="idx"></td>';
    inner += '<td data-label="Description"><input class="desc" placeholder="Item description"></td>';
    inner += '<td data-label="HSN"><input class="hsn" placeholder=""></td>';
    inner += '<td data-label="Qty"><input class="qty" type="number" min="0" value="1"></td>';
    inner += '<td data-label="Rate"><input class="rate" type="number" min="0" value="0"></td>';
    inner += '<td data-label="Amount" class="amount">0.00</td>';
    inner += '<td><button class="del">❌</button></td>';
    tr.innerHTML = inner;
    itemsBody.appendChild(tr);
    tr.querySelector('.qty').addEventListener('input', recalc);
    tr.querySelector('.rate').addEventListener('input', recalc);
    tr.querySelector('.del').addEventListener('click', function(){ tr.remove(); recalc(); });
    tr.querySelectorAll('input').forEach(function(inp){ inp.addEventListener('focus', function(e){ e.target.dataset.prefilled = e.target.value; e.target.value = ''; }); inp.addEventListener('blur', function(e){ if(e.target.value==='') e.target.value = e.target.dataset.prefilled || ''; }); });
    recalc();
  });

  itemsBody.querySelectorAll('tr').forEach(function(tr){
    var q = tr.querySelector('.qty');
    var r = tr.querySelector('.rate');
    var d = tr.querySelector('.del');
    if(q) q.addEventListener('input', recalc);
    if(r) r.addEventListener('input', recalc);
    if(d) d.addEventListener('click', function(){ tr.remove(); recalc(); });
  });

  document.getElementById('itemsTable').addEventListener('input', recalc);

  // GST lookup triggers
  let gstTimeout = null;
  buyerGST.addEventListener('input', function(e){
    var v = e.target.value.trim();
    if (gstTimeout) clearTimeout(gstTimeout);
    if (v.length === 15) { gstTimeout = setTimeout(function(){ lookupAndFillGST(v); }, 500); }
  });
  buyerGST.addEventListener('blur', function(e){ var v = e.target.value.trim(); if (v.length === 15) lookupAndFillGST(v); });

  function lookupAndFillGST(gstin){
    fetchGST(gstin).then(function(res){
      if(res){
        if(res.tradeName) buyerName.value = res.tradeName;
        if(res.address) buyerAddress.value = res.address;
        if(res.state) buyerState.value = res.state;
      }
    });
  }

  // Generate PDF using html2pdf and save as invoice.pdf
  function generatePdf() {
    recalc();
    const opt = {
      margin:       12,
      filename:     'invoice.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    return html2pdf().set(opt).from(invoiceBox).save();
  }

  // WhatsApp button: generate PDF then open wa.me link with message
  whatsappBtn.addEventListener('click', function(){
    const numRaw = document.getElementById('buyerWhats').value.trim();
    if(!numRaw){
      alert('Please enter customer WhatsApp number in the "WhatsApp (optional)" field first.');
      return;
    }
    let digits = numRaw.replace(/\D/g,'');
    if(digits.length === 10) digits = '91' + digits;
    if(digits.length < 11){
      alert('Please enter a valid WhatsApp number including country code (or 10-digit Indian number).');
      return;
    }
    generatePdf().then(function(){ 
      const message = encodeURIComponent('Hello! Please find your invoice from Shri Enterprise.');
      const wa = 'https://wa.me/' + digits + '?text=' + message;
      window.open(wa, '_blank');
    }).catch(function(err){
      console.error(err);
      alert('Could not generate PDF. Try downloading manually and then sending via WhatsApp.');
    });
  });

  // Download PDF button
  generatePdfBtn.addEventListener('click', function(){
    generatePdf().catch(function(err){ console.error(err); alert('PDF generation failed: ' + err.message); });
  });

  // Reset logic
  resetBtn.addEventListener('click', function(){
    if (!confirm('Reset the invoice? All inputs will be cleared.')) return;
    document.querySelectorAll('input').forEach(function(i){ i.value = ''; });
    document.getElementById('invoiceDate').valueAsDate = new Date();
    itemsBody.innerHTML = '<tr><td class="idx">1</td><td data-label="Description"><input class="desc" value="Sample Item"></td><td data-label="HSN"><input class="hsn" value=""></td><td data-label="Qty"><input class="qty" type="number" min="0" value="1"></td><td data-label="Rate"><input class="rate" type="number" min="0" value="0"></td><td data-label="Amount" class="amount">0.00</td><td><button class="del">❌</button></td></tr>';
    document.querySelectorAll('.qty').forEach(function(q){ q.addEventListener('input', recalc); });
    document.querySelectorAll('.rate').forEach(function(r){ r.addEventListener('input', recalc); });
    document.querySelectorAll('.del').forEach(function(d){ d.addEventListener('click', function(e){ e.target.closest('tr').remove(); recalc(); }); });
    recalc();
  });

});
