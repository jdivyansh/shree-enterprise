
// Configuration: set your GST API details here
const GST_API = {
  endpoint: 'https://api.knowyourgst.com/gstin/', // << replace with provider endpoint
  apiKey: '', // << paste your API key here
  useQuery: true, // if the provider requires key as query param
  keyParam: 'api_key', // query param name when useQuery=true
  headerName: 'x-api-key' // header name if useQuery=false
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
    let url = GST_API.endpoint + encodeURIComponent(clean);
    if (GST_API.useQuery && GST_API.apiKey) {
      const sep = url.includes('?') ? '&' : '?';
      url += sep + encodeURIComponent(GST_API.keyParam) + '=' + encodeURIComponent(GST_API.apiKey);
    }
    const headers = {};
    if (!GST_API.useQuery && GST_API.apiKey) {
      headers[GST_API.headerName || 'x-api-key'] = GST_API.apiKey;
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      showStatus('GST lookup failed: ' + res.statusText, false);
      return null;
    }
    const data = await res.json();
    let tradeName = data.tradeName || data.tradename || data.legalName || data.legalname || data.name || (data.result && data.result.legalName);
    let address = '';
    if (data.address) address = data.address;
    else if (data.result && data.result.address) address = data.result.address;
    else if (data.principalPlace || data.principalPlaceOfBusiness) {
      const p = data.principalPlace || data.principalPlaceOfBusiness;
      address = [p.addressLine1, p.addressLine2, p.city, p.pincode].filter(Boolean).join(', ');
    }
    let state = data.state || (data.result && data.result.state) || '';
    showStatus('Fetched from GST portal', true);
    return { tradeName, address, state, raw: data };
  } catch (e) {
    console.error(e);
    showStatus('GST lookup error: ' + e.message, false);
    return null;
  }
}

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
  const printBtn = document.getElementById('printBtn');
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
    tr.innerHTML = `
      <td class="idx"></td>
      <td data-label="Description"><input class="desc" placeholder="Item description"></td>
      <td data-label="HSN"><input class="hsn" placeholder=""></td>
      <td data-label="Qty"><input class="qty" type="number" min="0" value="1"></td>
      <td data-label="Rate"><input class="rate" type="number" min="0" value="0"></td>
      <td data-label="Amount" class="amount">0.00</td>
      <td><button class="del">❌</button></td>
    `;
    itemsBody.appendChild(tr);
    tr.querySelector('.qty').addEventListener('input', recalc);
    tr.querySelector('.rate').addEventListener('input', recalc);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); recalc(); });
    tr.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('focus', (e) => { e.target.dataset.prefilled = e.target.value; e.target.value = ''; });
      inp.addEventListener('blur', (e) => { if(e.target.value==='') e.target.value = e.target.dataset.prefilled || ''; });
    });
    recalc();
  });

  itemsBody.querySelectorAll('tr').forEach(tr => {
    tr.querySelector('.qty').addEventListener('input', recalc);
    tr.querySelector('.rate').addEventListener('input', recalc);
    tr.querySelector('.del').addEventListener('click', () => { tr.remove(); recalc(); });
  });

  document.getElementById('itemsTable').addEventListener('input', recalc);

  let gstTimeout = null;
  buyerGST.addEventListener('input', (e) => {
    const v = e.target.value.trim();
    if (gstTimeout) clearTimeout(gstTimeout);
    if (v.length === 15) {
      gstTimeout = setTimeout(() => { lookupAndFillGST(v); }, 500);
    }
  });
  buyerGST.addEventListener('blur', (e) => {
    const v = e.target.value.trim();
    if (v.length === 15) lookupAndFillGST(v);
  });

  async function lookupAndFillGST(gstin) {
    const res = await fetchGST(gstin);
    if (res) {
      if (res.tradeName) buyerName.value = res.tradeName;
      if (res.address) buyerAddress.value = res.address;
      if (res.state) buyerState.value = res.state;
    }
  }

  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset the invoice? All inputs will be cleared.')) return;
    document.querySelectorAll('input').forEach(i => i.value = '');
    document.getElementById('invoiceDate').valueAsDate = new Date();
    itemsBody.innerHTML = `
      <tr>
        <td class="idx">1</td>
        <td data-label="Description"><input class="desc" value="Sample Item"></td>
        <td data-label="HSN"><input class="hsn" value=""></td>
        <td data-label="Qty"><input class="qty" type="number" min="0" value="1"></td>
        <td data-label="Rate"><input class="rate" type="number" min="0" value="0"></td>
        <td data-label="Amount" class="amount">0.00</td>
        <td><button class="del">❌</button></td>
      </tr>
    `;
    document.querySelectorAll('.qty').forEach(q => q.addEventListener('input', recalc));
    document.querySelectorAll('.rate').forEach(r => r.addEventListener('input', recalc));
    document.querySelectorAll('.del').forEach(d => d.addEventListener('click', (e)=>{ e.target.closest('tr').remove(); recalc(); }));
    recalc();
  });

  printBtn.addEventListener('click', () => {
    recalc();
    window.print();
  });
});
