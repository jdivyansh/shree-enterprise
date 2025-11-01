function updateTotals() {
  let grandTotal = 0;
  const rows = document.querySelectorAll("#billBody tr");

  rows.forEach(row => {
    const qty = row.querySelector('td:nth-child(2) input').valueAsNumber || 0;
    const price = row.querySelector('td:nth-child(3) input').valueAsNumber || 0;
    const total = qty * price;
    row.querySelector('.itemTotal').textContent = total.toFixed(2);
    grandTotal += total;
  });

  document.getElementById("grandTotal").textContent = grandTotal.toFixed(2);
}

document.getElementById("addRow").addEventListener("click", () => {
  const newRow = document.createElement("tr");
  newRow.innerHTML = `
    <td><input type="text" placeholder="Item"></td>
    <td><input type="number" min="1" value="1"></td>
    <td><input type="number" min="0" value="0"></td>
    <td class="itemTotal">0</td>
    <td><button class="deleteBtn">❌</button></td>
  `;
  document.getElementById("billBody").appendChild(newRow);
});

document.getElementById("billBody").addEventListener("input", updateTotals);

document.getElementById("billBody").addEventListener("click", e => {
  if (e.target.classList.contains("deleteBtn")) {
    e.target.closest("tr").remove();
    updateTotals();
  }
});

document.getElementById("printBill").addEventListener("click", () => {
  window.print();
});

updateTotals();
