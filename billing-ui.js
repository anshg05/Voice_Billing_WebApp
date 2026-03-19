function addItem(item) {
  var rate = item.rate !== undefined ? item.rate : (item.price !== undefined ? item.price : null);
  var total = item.total !== undefined && item.total !== null ? item.total : (rate !== null ? item.qty * rate : 0);

  var existing = billItems.find(function(existingItem) {
    return existingItem.displayName.toLowerCase() === item.displayName.toLowerCase();
  });

  if (existing) {
    existing.qty = +(existing.qty + item.qty).toFixed(3);
    if (existing.rate !== null && existing.rate !== undefined) {
      existing.total = existing.qty * existing.rate;
    } else {
      existing.total = +(existing.total + total).toFixed(2);
    }
    return;
  }

  billItems.push({
    id: Date.now() + Math.random(),
    displayName: item.displayName,
    qty: item.qty || 1,
    unit: item.unit || "piece",
    rate: rate,
    total: total,
    isCustom: item.isCustom || false
  });
}

function removeItem(id) {
  billItems = billItems.filter(function(item) {
    return item.id !== id;
  });
  renderBill();
}

function updateQty(id, value) {
  var item = billItems.find(function(entry) {
    return entry.id === id;
  });
  if (!item) {
    return;
  }

  item.qty = parseFloat(value) || 0;
  if (item.rate !== null && item.rate !== undefined) {
    item.total = +(item.qty * item.rate).toFixed(2);
  }
  renderBill();
}

function updateRate(id, value) {
  var item = billItems.find(function(entry) {
    return entry.id === id;
  });
  if (!item) {
    return;
  }

  var normalizedValue = String(value).trim();
  item.rate = normalizedValue === "" ? null : (parseFloat(normalizedValue) || 0);
  if (item.rate !== null) {
    item.total = +(item.qty * item.rate).toFixed(2);
  }
  renderBill();
}

function updateTotal(id, value) {
  var item = billItems.find(function(entry) {
    return entry.id === id;
  });
  if (!item) {
    return;
  }

  var parsedValue = parseFloat(value);
  if (!isNaN(parsedValue)) {
    item.total = parsedValue;
    item.rate = null;
  }
  renderBill();
}

function updateName(id, value) {
  var item = billItems.find(function(entry) {
    return entry.id === id;
  });
  if (item && value.trim()) {
    item.displayName = value.trim();
  }
}

function updateUnit(id, value) {
  var item = billItems.find(function(entry) {
    return entry.id === id;
  });
  if (item && value) {
    item.unit = value;
  }
}

function clearBill() {
  billItems = [];
  renderBill();
  showToast("Bill clear ho gaya", "info");
}

function getTotal() {
  return billItems.reduce(function(sum, item) {
    return sum + item.total;
  }, 0);
}

function openAddItem() {
  document.getElementById("aiName").value = "";
  document.getElementById("aiQty").value = "1";
  document.getElementById("aiUnit").value = "piece";
  document.getElementById("aiRate").value = "";
  openSheet("addItemSheet");
  setTimeout(function() {
    document.getElementById("aiName").focus();
  }, 350);
}

function addManualItem() {
  var name = document.getElementById("aiName").value.trim();
  var qty = parseFloat(document.getElementById("aiQty").value) || 1;
  var unit = document.getElementById("aiUnit").value;
  var rateRaw = document.getElementById("aiRate").value.trim();
  var rate = rateRaw === "" ? null : (parseFloat(rateRaw) || 0);
  var total = rate !== null ? qty * rate : 0;

  if (!name) {
    showToast("Item ka naam daalein", "err");
    return;
  }

  addItem({
    displayName: name,
    qty: qty,
    unit: unit,
    rate: rate,
    total: total,
    isCustom: true
  });

  renderBill();
  closeSheet("addItemSheet");
  showToast(name + " added \u2713", "ok");
}

function renderBill() {
  var addItemRow = document.getElementById("addItemRow");
  var tbody = document.getElementById("billBody");
  var billCards = document.getElementById("billCards");
  var totalAmount = document.getElementById("totalAmount");
  var emptyState = document.getElementById("emptyState");
  var table = document.getElementById("billTable");
  var badge = document.getElementById("itemBadge");
  var billArea = addItemRow ? addItemRow.parentNode : null;

  badge.textContent = billItems.length;

  if (billItems.length === 0) {
    if (billArea && addItemRow && emptyState && addItemRow.nextElementSibling !== emptyState) {
      billArea.insertBefore(addItemRow, emptyState);
    }
    if (addItemRow) {
      addItemRow.classList.add("add-item-row-top");
    }
    emptyState.style.display = "flex";
    table.style.display = "none";
    billCards.style.display = "none";
    billCards.innerHTML = "";
    totalAmount.textContent = "\u20B90";
    return;
  }

  emptyState.style.display = "none";
  table.style.display = "table";
  billCards.style.display = "";
  if (billArea && addItemRow && billCards && addItemRow.previousElementSibling !== billCards) {
    billArea.insertBefore(addItemRow, billCards.nextSibling);
  }
  if (addItemRow) {
    addItemRow.classList.remove("add-item-row-top");
  }

  tbody.innerHTML = billItems.map(function(item) {
    var rateValue = item.rate !== null && item.rate !== undefined ? item.rate : "";
    var totalValue = item.total !== undefined ? item.total.toFixed(0) : "0";
    var unitOptions = BILL_UNITS.map(function(unit) {
      return '<option value="' + unit + '"' + (item.unit === unit ? " selected" : "") + ">" + unit + "</option>";
    }).join("");

    return '<tr class="bill-row" data-id="' + item.id + '">'
      + '<td class="col-name">'
      + '<input class="cell-inp name-inp" type="text" value="' + item.displayName.replace(/"/g, "&quot;") + '" onchange="updateName(' + item.id + ', this.value)" />'
      + (item.isCustom ? '<span class="new-tag">NEW</span>' : "")
      + "</td>"
      + '<td class="col-qty"><div class="inp-wrap">'
      + '<input class="cell-inp qty-inp" type="number" value="' + item.qty + '" min="0.25" step="0.25" onchange="updateQty(' + item.id + ', this.value)" />'
      + '<select class="unit-sel" onchange="updateUnit(' + item.id + ', this.value)">' + unitOptions + "</select>"
      + "</div></td>"
      + '<td class="col-rate"><input class="cell-inp rate-inp" type="number" value="' + rateValue + '" placeholder="-" min="0" onchange="updateRate(' + item.id + ', this.value)" /></td>'
      + '<td class="col-amt"><input class="total-inp" type="number" value="' + totalValue + '" min="0" onchange="updateTotal(' + item.id + ', this.value)" /></td>'
      + '<td class="col-del"><button class="del-btn" onclick="removeItem(' + item.id + ')">'
      + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      + "</button></td>"
      + "</tr>";
  }).join("");

  billCards.innerHTML = billItems.map(function(item) {
    var rateValue = item.rate !== null && item.rate !== undefined ? item.rate : "";
    var totalValue = item.total !== undefined ? item.total.toFixed(0) : "0";
    var unitOptions = BILL_UNITS.map(function(unit) {
      return '<option value="' + unit + '"' + (item.unit === unit ? " selected" : "") + ">" + unit + "</option>";
    }).join("");

    return '<div class="bill-card" data-id="' + item.id + '">'
      + '<button class="bill-card-del" onclick="removeItem(' + item.id + ')" aria-label="Remove item">'
      + '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      + "</button>"
      + '<div class="bill-card-field bill-card-field-name">'
      + '<div class="bill-card-label">Item</div>'
      + '<input class="cell-inp name-inp" type="text" value="' + item.displayName.replace(/"/g, "&quot;") + '" onchange="updateName(' + item.id + ', this.value)" />'
      + (item.isCustom ? '<span class="new-tag">NEW</span>' : "")
      + "</div>"
      + '<div class="bill-card-field bill-card-field-qty">'
      + '<div class="bill-card-label">Qty</div>'
      + '<div class="inp-wrap">'
      + '<input class="cell-inp qty-inp" type="number" value="' + item.qty + '" min="0.25" step="0.25" onchange="updateQty(' + item.id + ', this.value)" />'
      + '<select class="unit-sel" onchange="updateUnit(' + item.id + ', this.value)">' + unitOptions + "</select>"
      + "</div></div>"
      + '<div class="bill-card-field bill-card-field-rate">'
      + '<div class="bill-card-label">Rate</div>'
      + '<input class="cell-inp rate-inp" type="number" value="' + rateValue + '" placeholder="-" min="0" onchange="updateRate(' + item.id + ', this.value)" />'
      + "</div>"
      + '<div class="bill-card-field bill-card-field-total">'
      + '<div class="bill-card-label">Total</div>'
      + '<input class="total-inp" type="number" value="' + totalValue + '" min="0" onchange="updateTotal(' + item.id + ', this.value)" />'
      + "</div>"
      + "</div>";
  }).join("");

  totalAmount.textContent = "\u20B9" + getTotal().toFixed(0);
}

function getPreviewBillWidth() {
  var viewportWidth = window.innerWidth || document.documentElement.clientWidth || BILL_W;

  if (viewportWidth <= 768) {
    return Math.max(320, Math.min(BILL_W, viewportWidth - 56));
  }

  return BILL_W;
}

function buildBillHTML(overrideItems, overrideCustomer, previewWidth) {
  var items = overrideItems || billItems;
  var customerName = overrideCustomer !== undefined ? overrideCustomer : getCustomerName();
  var now = new Date();
  var dateString = now.toLocaleDateString("en-IN");
  var timeString = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  var fontStyle = "font-family:monospace;";
  var billWidth = previewWidth || BILL_W;
  var innerWidth = billWidth - 48;
  var compactPreview = billWidth < 420;
  var qtyColWidth = compactPreview ? 76 : 90;
  var rateColWidth = compactPreview ? 56 : 60;
  var amtColWidth = compactPreview ? 60 : 60;
  var itemColWidth = Math.max(innerWidth - qtyColWidth - rateColWidth - amtColWidth, compactPreview ? 90 : 120);
  var titleSize = compactPreview ? 18 : 22;
  var metaSize = compactPreview ? 11 : 12;
  var cellSize = compactPreview ? 13 : 14;
  var headSize = compactPreview ? 12 : 13;
  var totalLabelSize = compactPreview ? 15 : 16;
  var totalValueSize = compactPreview ? 17 : 18;

  var rows = items.map(function(item) {
    var rateDisplay = item.rate !== null && item.rate !== undefined ? "\u20B9" + item.rate : "-";
    return "<tr>"
      + '<td style="' + fontStyle + 'padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:' + cellSize + 'px;color:#111;word-break:break-word;">' + item.displayName + "</td>"
      + '<td style="' + fontStyle + 'padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:' + cellSize + 'px;color:#111;white-space:nowrap;">' + item.qty + " " + item.unit + "</td>"
      + '<td style="' + fontStyle + 'padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:' + cellSize + 'px;color:#111;text-align:right;white-space:nowrap;">' + rateDisplay + "</td>"
      + '<td style="' + fontStyle + 'padding:7px 8px;border-bottom:1px solid #e0e0e0;font-size:' + cellSize + 'px;font-weight:700;color:#000;text-align:right;white-space:nowrap;">\u20B9' + item.total.toFixed(0) + "</td>"
      + "</tr>";
  }).join("");

  var total = items.reduce(function(sum, item) {
    return sum + item.total;
  }, 0);
  var dashLine = "- - - - - - - - - - - - - - - - - - - - - - - - -";
  var dash = '<div style="' + fontStyle + 'color:#aaa;font-size:13px;letter-spacing:1px;margin:10px 0;text-align:center;">' + dashLine + "</div>";
  var customerLine = customerName
    ? '<div style="' + fontStyle + 'margin-top:6px;font-size:' + metaSize + 'px;color:#555;">Customer: ' + customerName + "</div>"
    : "";

  return '<div style="' + fontStyle + "background:#fff;width:" + billWidth + 'px;box-sizing:border-box;padding:' + (compactPreview ? "22px 16px 18px" : "28px 24px 22px") + ';">'
    + '<div style="text-align:center;margin-bottom:16px;">'
    + '<div style="' + fontStyle + 'font-size:' + titleSize + 'px;font-weight:700;color:#000;">' + shopName + "</div>"
    + (shopPhone ? '<div style="' + fontStyle + 'font-size:' + metaSize + 'px;color:#444;margin-top:5px;">\uD83D\uDCDE ' + shopPhone + "</div>" : "")
    + '<div style="' + fontStyle + 'font-size:' + metaSize + 'px;color:#666;margin-top:5px;">' + dateString + " | " + timeString + "</div>"
    + customerLine
    + "</div>"
    + dash
    + '<table style="width:' + innerWidth + 'px;border-collapse:collapse;table-layout:fixed;">'
    + "<colgroup>"
    + '<col style="width:' + itemColWidth + 'px">'
    + '<col style="width:' + qtyColWidth + 'px">'
    + '<col style="width:' + rateColWidth + 'px">'
    + '<col style="width:' + amtColWidth + 'px">'
    + "</colgroup>"
    + "<thead><tr>"
    + '<th style="' + fontStyle + 'padding:6px 8px 9px;font-size:' + headSize + 'px;font-weight:700;color:#333;text-align:left;border-bottom:1.5px solid #555;">Item</th>'
    + '<th style="' + fontStyle + 'padding:6px 8px 9px;font-size:' + headSize + 'px;font-weight:700;color:#333;text-align:left;border-bottom:1.5px solid #555;">Qty</th>'
    + '<th style="' + fontStyle + 'padding:6px 8px 9px;font-size:' + headSize + 'px;font-weight:700;color:#333;text-align:right;border-bottom:1.5px solid #555;">Rate</th>'
    + '<th style="' + fontStyle + 'padding:6px 8px 9px;font-size:' + headSize + 'px;font-weight:700;color:#333;text-align:right;border-bottom:1.5px solid #555;">Amt</th>'
    + "</tr></thead>"
    + "<tbody>" + rows + "</tbody>"
    + "</table>"
    + dash
    + '<div style="display:flex;justify-content:space-between;align-items:baseline;width:' + innerWidth + 'px;padding:4px 8px;">'
    + '<span style="' + fontStyle + 'font-size:' + totalLabelSize + 'px;font-weight:800;color:#000;">TOTAL</span>'
    + '<span style="' + fontStyle + 'font-size:' + totalValueSize + 'px;font-weight:800;color:#000;">\u20B9' + total.toFixed(0) + "</span>"
    + "</div>"
    + dash
    + '<div style="' + fontStyle + 'text-align:center;font-size:' + metaSize + 'px;color:#555;margin-top:4px;">\u0927\u0928\u094D\u092F\u0935\u093E\u0926! &nbsp; Thank You!</div>'
    + "</div>";
}

function buildReceiptRows(doc, items) {
  return items.map(function(item) {
    return {
      name: item.displayName,
      nameLines: [item.displayName],
      qtyText: item.qty + " " + item.unit,
      rateText: item.rate !== null && item.rate !== undefined ? "Rs" + item.rate : "-",
      amountText: "Rs" + item.total.toFixed(0)
    };
  });
}

function createReceiptPDF(items, customer, timestamp) {
  var jspdf = window.jspdf;
  var pageWidth = 92;
  var margin = 7;
  var measureDoc = new jspdf.jsPDF({ unit: "mm", format: [pageWidth, 200], orientation: "portrait" });
  var rows = buildReceiptRows(measureDoc, items);
  var colGap = 4;
  var contentWidth = pageWidth - margin * 2;
  var y = 10;

  measureDoc.setFont("courier", "bold");
  measureDoc.setFontSize(9.5);
  var qtyWidth = measureDoc.getTextWidth("Qty");
  var rateWidth = measureDoc.getTextWidth("Rate");
  var amountWidth = measureDoc.getTextWidth("Amt");

  measureDoc.setFont("courier", "normal");
  measureDoc.setFontSize(9.4);
  rows.forEach(function(row) {
    qtyWidth = Math.max(qtyWidth, measureDoc.getTextWidth(row.qtyText));
    rateWidth = Math.max(rateWidth, measureDoc.getTextWidth(row.rateText));
    amountWidth = Math.max(amountWidth, measureDoc.getTextWidth(row.amountText));
  });

  qtyWidth += 2;
  rateWidth += 2;
  amountWidth += 2;

  var amountRight = pageWidth - margin;
  var amountLeft = amountRight - amountWidth;
  var rateRight = amountLeft - colGap;
  var rateLeft = rateRight - rateWidth;
  var qtyRight = rateLeft - colGap;
  var qtyLeft = qtyRight - qtyWidth;
  var itemWidth = Math.max(qtyLeft - margin - colGap, 24);

  rows.forEach(function(row) {
    row.nameLines = measureDoc.splitTextToSize(row.name, itemWidth);
  });

  y += 9;
  if (shopPhone) {
    y += 5.5;
  }
  y += 5.5;
  if (customer) {
    y += 5.5;
  }
  y += 6.5;
  y += 7.5;

  rows.forEach(function(row) {
    y += Math.max(row.nameLines.length * 4.6, 4.6) + 4;
  });

  y += 8;
  y += 8;
  y += 9;

  var doc = new jspdf.jsPDF({
    unit: "mm",
    format: [Math.max(y, 120), pageWidth],
    orientation: "portrait"
  });
  var date = timestamp || new Date();
  var dateText = date.toLocaleDateString("en-IN");
  var timeText = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  var renderedRows = buildReceiptRows(doc, items);
  var total = items.reduce(function(sum, item) {
    return sum + item.total;
  }, 0);
  renderedRows.forEach(function(row) {
    row.nameLines = doc.splitTextToSize(row.name, itemWidth);
  });

  function drawDivider(lineY) {
    doc.setDrawColor(210, 210, 210);
    doc.setLineDashPattern([1.2, 3.2], 0);
    doc.line(margin, lineY, pageWidth - margin, lineY);
    doc.setLineDashPattern([], 0);
  }

  y = 10;
  doc.setFont("courier", "bold");
  doc.setFontSize(12.5);
  doc.text(shopName, pageWidth / 2, y, { align: "center" });

  y += 7;
  doc.setFont("courier", "normal");
  doc.setFontSize(9.5);
  if (shopPhone) {
    doc.text(shopPhone, pageWidth / 2, y, { align: "center" });
    y += 5.5;
  }
  doc.text(dateText + " | " + timeText, pageWidth / 2, y, { align: "center" });

  if (customer) {
    y += 5.5;
    doc.text("Customer: " + customer, pageWidth / 2, y, { align: "center" });
  }

  y += 6.5;
  drawDivider(y);

  y += 7;
  doc.setFont("courier", "bold");
  doc.setFontSize(9.5);
  doc.text("Item", margin, y);
  doc.text("Qty", qtyRight, y, { align: "right" });
  doc.text("Rate", rateRight, y, { align: "right" });
  doc.text("Amt", amountRight, y, { align: "right" });

  y += 2.5;
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y, pageWidth - margin, y);

  renderedRows.forEach(function(row) {
    y += 5.8;
    doc.setFont("courier", "normal");
    doc.setFontSize(9.4);
    doc.text(row.nameLines, margin, y);
    doc.text(row.qtyText, qtyRight, y, { align: "right" });
    doc.text(row.rateText, rateRight, y, { align: "right" });
    doc.text(row.amountText, amountRight, y, { align: "right" });
    y += Math.max((row.nameLines.length - 1) * 4.6, 0) + 3;
  });

  y += 5;
  drawDivider(y);

  y += 8;
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", margin, y);
  doc.text("Rs" + total.toFixed(0), amountRight, y, { align: "right" });

  y += 6;
  drawDivider(y);

  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(9.2);
  doc.text("Thank You!", pageWidth / 2, y, { align: "center" });

  return doc;
}

function finalizeBill() {
  if (billItems.length === 0) {
    showToast("Bill \u0916\u093E\u0932\u0940 \u0939\u0948!", "err");
    return;
  }

  stopListening();
  var customer = getCustomerName();
  document.getElementById("billPreviewContent").innerHTML = buildBillHTML(undefined, undefined, getPreviewBillWidth());
  saveBillToHistory(customer);
  openSheet("billSheet");
}

async function renderOffscreen(html) {
  var offscreen = document.createElement("div");
  offscreen.style.cssText = "position:absolute;left:0;top:0;width:" + BILL_W + "px;background:#fff;z-index:-1;pointer-events:none;overflow:visible;";
  offscreen.innerHTML = html;
  document.body.appendChild(offscreen);

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (error) {}
  }

  await new Promise(function(resolve) {
    setTimeout(resolve, 400);
  });

  var captureTarget = offscreen.firstElementChild || offscreen;
  var captureWidth = Math.ceil(captureTarget.scrollWidth || captureTarget.offsetWidth || BILL_W);
  var captureHeight = Math.ceil(captureTarget.scrollHeight || captureTarget.offsetHeight);

  var canvas = await html2canvas(captureTarget, {
    scale: 2.5,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    width: captureWidth,
    height: captureHeight,
    scrollX: 0,
    scrollY: 0,
    windowWidth: captureWidth,
    windowHeight: captureHeight
  });

  document.body.removeChild(offscreen);
  return canvas;
}

async function downloadImage() {
  try {
    showToast("Image ban rahi hai...", "info");
    var canvas = await renderOffscreen(buildBillHTML());
    var link = document.createElement("a");
    link.download = "KiranaBill-" + Date.now() + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Image saved! \u2713", "ok");
  } catch (error) {
    console.error(error);
    showToast("Download failed", "err");
  }
}

async function downloadPDF() {
  try {
    showToast("PDF ban raha hai...", "info");
    var doc = createReceiptPDF(billItems, getCustomerName(), new Date());
    doc.save("KiranaBill-" + Date.now() + ".pdf");
    showToast("PDF saved! \u2713", "ok");
  } catch (error) {
    console.error(error);
    showToast("PDF failed", "err");
  }
}

async function shareWhatsApp() {
  try {
    showToast("Preparing...", "info");
    var canvas = await renderOffscreen(buildBillHTML());

    canvas.toBlob(async function(blob) {
      var file = new File([blob], "KiranaBill.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Bill - " + shopName });
          showToast("Shared! \u2713", "ok");
          return;
        } catch (error) {}
      }

      var message = "*" + shopName + "*\n";
      if (shopPhone) {
        message += "\uD83D\uDCDE " + shopPhone + "\n";
      }
      message += "\uD83D\uDCC5 " + new Date().toLocaleDateString("en-IN") + "\n" + "\u2500".repeat(22) + "\n";
      billItems.forEach(function(item) {
        message += item.displayName + "  " + item.qty + item.unit + "  \u20B9" + item.total.toFixed(0) + "\n";
      });
      message += "\u2500".repeat(22) + "\n*Total: \u20B9" + getTotal().toFixed(0) + "*\n_\u0927\u0928\u094D\u092F\u0935\u093E\u0926 \uD83D\uDE4F_";

      window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank");
      showToast("WhatsApp khul raha hai...", "ok");
    }, "image/png");
  } catch (error) {
    showToast("Share failed", "err");
  }
}

function openSMSSheet() {
  currentSMSContext = null;
  document.getElementById("smsNumber").value = "";
  updateSMSPreview();
  openSheet("smsSheet");
}

function closeSMSSheet(options) {
  closeSheet("smsSheet", options);
  if (currentSMSContext && currentSMSContext.returnToHistory) {
    openHistory(options && options.fromPop ? { skipHistory: true } : undefined);
  }
}

function buildSMSText(itemsOverride, totalOverride, customerOverride, dateOverride) {
  var items = itemsOverride || billItems;
  var total = totalOverride !== undefined ? totalOverride : getTotal();
  var customer = customerOverride || "";
  var dateText = dateOverride || new Date().toLocaleDateString("en-IN");
  var message = shopName + "\n";

  if (shopPhone) {
    message += "Ph: " + shopPhone + "\n";
  }
  if (customer) {
    message += "Customer: " + customer + "\n";
  }

  message += "Date: " + dateText + "\n---\n";
  items.forEach(function(item) {
    message += item.displayName + " " + item.qty + item.unit + " = Rs." + item.total.toFixed(0) + "\n";
  });
  message += "---\nTOTAL: Rs." + total.toFixed(0) + "\nDhanyavaad!";

  return message;
}

function updateSMSPreview() {
  var number = document.getElementById("smsNumber").value;
  var previewText = currentSMSContext
    ? buildSMSText(
        currentSMSContext.items,
        currentSMSContext.total,
        currentSMSContext.customer,
        currentSMSContext.dateText
      )
    : buildSMSText();

  document.getElementById("smsPreview").textContent = number.length >= 3
    ? previewText
    : "Number daalne par preview dikhega...";
}

function sendSMS() {
  var number = document.getElementById("smsNumber").value.trim();
  if (!number || number.length < 10) {
    showToast("Valid 10-digit number daalein", "err");
    return;
  }

  var smsText = currentSMSContext
    ? buildSMSText(
        currentSMSContext.items,
        currentSMSContext.total,
        currentSMSContext.customer,
        currentSMSContext.dateText
      )
    : buildSMSText();

  window.location.href = "sms:" + number + "?body=" + encodeURIComponent(smsText);
  showToast("SMS app khul rahi hai...", "ok");
}

function openSettingsSheet() {
  document.getElementById("inpShopName").value = shopName;
  document.getElementById("inpShopPhone").value = shopPhone;
  document.getElementById("inpBillLang").value = billLang;
  openSheet("settingsSheet");
}

function saveSettings() {
  shopName = document.getElementById("inpShopName").value.trim() || "My Kirana Store";
  shopPhone = document.getElementById("inpShopPhone").value.trim();
  billLang = document.getElementById("inpBillLang").value;

  localStorage.setItem("kb_shopName", shopName);
  localStorage.setItem("kb_shopPhone", shopPhone);
  localStorage.setItem("kb_billLang", billLang);

  document.getElementById("shopLabel").textContent = shopName;
  closeSheet("settingsSheet");
  showToast("Saved \u2713", "ok");
}

function saveBillToHistory(customer) {
  var history = loadHistory();

  history.unshift({
    id: Date.now(),
    ts: Date.now(),
    customer: customer || "",
    items: JSON.parse(JSON.stringify(billItems)),
    total: getTotal()
  });

  if (history.length > 200) {
    history.splice(200);
  }

  localStorage.setItem("kb_history", JSON.stringify(history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("kb_history") || "[]");
  } catch (error) {
    return [];
  }
}

function deleteHistoryEntry(id) {
  var history = loadHistory().filter(function(entry) {
    return entry.id !== id;
  });

  localStorage.setItem("kb_history", JSON.stringify(history));
  renderHistoryList();
}

function requestDeleteHistoryEntry(id) {
  pendingDeleteHistoryId = id;
  openSheet("deleteConfirmSheet");
}

function closeDeleteConfirm(options) {
  pendingDeleteHistoryId = null;
  closeSheet("deleteConfirmSheet", options);
}

function confirmDeleteHistoryEntry() {
  if (pendingDeleteHistoryId === null) {
    closeDeleteConfirm();
    return;
  }

  deleteHistoryEntry(pendingDeleteHistoryId);
  showToast("Bill deleted", "info");
  closeDeleteConfirm();
}

function openHistory(options) {
  renderHistoryList();
  openSheet("historySheet", options);
}

function renderHistoryList() {
  var history = loadHistory();
  var historyList = document.getElementById("historyList");

  if (history.length === 0) {
    historyList.innerHTML = '<div class="hist-empty">\uD83D\uDCCB<br><br>\u0905\u092D\u0940 \u0915\u094B\u0908 bill \u0928\u0939\u0940\u0902 \u092C\u0928\u093E\u0964<br><span class="hist-empty-note">Bill \u092C\u0928\u093E\u0928\u0947 \u0915\u0947 \u092C\u093E\u0926 \u092F\u0939\u093E\u0901 \u0926\u093F\u0916\u0947\u0917\u093E\u0964</span></div>';
    return;
  }

  var groups = {};
  history.forEach(function(entry) {
    var key = new Date(entry.ts).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
  });

  var html = "";
  Object.entries(groups).forEach(function(pair) {
    var date = pair[0];
    var entries = pair[1];
    var isToday = new Date().toDateString() === new Date(entries[0].ts).toDateString();

    html += '<div class="hist-day-label">' + (isToday ? "\u2B50 \u0906\u091C \u2022 " : "") + date + "</div>";

    entries.forEach(function(entry) {
      var time = new Date(entry.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      var itemCount = entry.items.length;

      html += '<div class="hist-card" onclick="viewHistBill(' + entry.id + ')">'
        + '<div class="hist-card-left">'
        + '<div class="hist-customer">' + (entry.customer ? "\uD83D\uDC64 " + entry.customer : "\uD83E\uDDFE Bill") + "</div>"
        + '<div class="hist-meta">'
        + '<span class="hist-time">\uD83D\uDD50 ' + time + "</span>"
        + '<span class="hist-items-count">' + itemCount + " item" + (itemCount !== 1 ? "s" : "") + "</span>"
        + "</div>"
        + "</div>"
        + '<div class="hist-total">\u20B9' + entry.total.toFixed(0) + "</div>"
        + '<button class="hist-del-btn" onclick="event.stopPropagation();requestDeleteHistoryEntry(' + entry.id + ')" title="Delete">\uD83D\uDDD1</button>'
        + "</div>";
    });
  });

  historyList.innerHTML = html;
}

function viewHistBill(id) {
  var entry = loadHistory().find(function(historyEntry) {
    return historyEntry.id === id;
  });
  if (!entry) {
    return;
  }

  currentHistBill = entry;
  document.getElementById("histBillTitle").textContent = entry.customer ? "\uD83D\uDC64 " + entry.customer : "\uD83E\uDDFE Bill";
  document.getElementById("histBillPreview").innerHTML = buildBillHTML(entry.items, entry.customer, getPreviewBillWidth());
  openSheet("histBillSheet");
}

async function dlHistImage() {
  if (!currentHistBill) {
    return;
  }

  try {
    showToast("Image ban rahi hai...", "info");
    var canvas = await renderOffscreen(buildBillHTML(currentHistBill.items, currentHistBill.customer));
    var link = document.createElement("a");
    link.download = "KiranaBill-history.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    showToast("Image saved! \u2713", "ok");
  } catch (error) {
    showToast("Failed", "err");
  }
}

async function dlHistPDF() {
  if (!currentHistBill) {
    return;
  }

  try {
    showToast("PDF ban raha hai...", "info");
    var doc = createReceiptPDF(
      currentHistBill.items,
      currentHistBill.customer,
      new Date(currentHistBill.ts)
    );
    doc.save("KiranaBill-history.pdf");
    showToast("PDF saved! \u2713", "ok");
  } catch (error) {
    showToast("Failed", "err");
  }
}

async function shareHistWA() {
  if (!currentHistBill) {
    return;
  }

  try {
    showToast("Preparing...", "info");
    var canvas = await renderOffscreen(buildBillHTML(currentHistBill.items, currentHistBill.customer));

    canvas.toBlob(async function(blob) {
      var file = new File([blob], "KiranaBill.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "KiranaBill" });
          showToast("Shared! \u2713", "ok");
          return;
        } catch (error) {}
      }

      var message = "*" + shopName + "*\n";
      if (shopPhone) {
        message += "\uD83D\uDCDE " + shopPhone + "\n";
      }
      if (currentHistBill.customer) {
        message += "\uD83D\uDC64 " + currentHistBill.customer + "\n";
      }
      message += "\uD83D\uDCC5 " + new Date(currentHistBill.ts).toLocaleDateString("en-IN") + "\n" + "\u2500".repeat(22) + "\n";
      currentHistBill.items.forEach(function(item) {
        message += item.displayName + "  " + item.qty + item.unit + "  \u20B9" + item.total.toFixed(0) + "\n";
      });
      message += "\u2500".repeat(22) + "\n*Total: \u20B9" + currentHistBill.total.toFixed(0) + "*\n_\u0927\u0928\u094D\u092F\u0935\u093E\u0926 \uD83D\uDE4F_";

      window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank");
      showToast("WhatsApp khul raha hai...", "ok");
    }, "image/png");
  } catch (error) {
    showToast("Failed", "err");
  }
}

function shareHistSMS() {
  if (!currentHistBill) {
    return;
  }

  closeSheet("histBillSheet", { skipHistory: true });
  closeSheet("historySheet", { skipHistory: true });
  currentSMSContext = {
    items: currentHistBill.items,
    total: currentHistBill.total,
    customer: currentHistBill.customer,
    dateText: new Date(currentHistBill.ts).toLocaleDateString("en-IN"),
    returnToHistory: true
  };
  document.getElementById("smsNumber").value = "";
  document.getElementById("smsPreview").textContent = buildSMSText(
    currentSMSContext.items,
    currentSMSContext.total,
    currentSMSContext.customer,
    currentSMSContext.dateText
  );
  openSheet("smsSheet");
}
