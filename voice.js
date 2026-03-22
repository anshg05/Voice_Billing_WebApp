function initSpeech() {
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    alert("Chrome browser use karein.");
    return null;
  }

  var recognizer = new SpeechRecognitionCtor();
  recognizer.lang = "hi-IN";
  recognizer.continuous = !isMobileSpeechMode();
  recognizer.interimResults = true;
  recognizer.maxAlternatives = 1;

  recognizer.onresult = function(event) {
    var interim = "";
    var final = "";

    for (var i = event.resultIndex; i < event.results.length; i++) {
      var transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }

    var heardText = (final || interim).trim();
    if (heardText) {
      lastHeardTranscript = heardText;
    }

    setTranscript(interim, final);
    if (final.trim()) {
      speechHadFinalResult = true;
      handleFinalTranscript(final.trim());
      lastHeardTranscript = "";
    }
  };

  recognizer.onerror = function(event) {
    clearTimeout(micRetryTimer);
    micRetryTimer = null;

    if (event.error === "no-speech" || event.error === "aborted") {
      return;
    }

    if (isMobileSpeechMode() && micRetryCount < 1 && (event.error === "network" || event.error === "audio-capture")) {
      recognition = null;
      isListening = false;
      setListening(false);
      micRetryCount += 1;
      micRetryTimer = setTimeout(function() {
        startListening();
      }, 220);
      return;
    }

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      showToast("Mic permission allow karein", "err");
    } else if (event.error === "audio-capture") {
      showToast("Mic available nahin hai", "err");
    } else {
      showToast("Mic error", "err");
    }

    recognition = null;
    isListening = false;
    setListening(false);
  };

  recognizer.onend = function() {
    if (isListening && !isMobileSpeechMode()) {
      try {
        recognizer.start();
      } catch (error) {}
      return;
    }

    if (isListening && isMobileSpeechMode()) {
      if (!speechHadFinalResult && lastHeardTranscript.trim()) {
        handleFinalTranscript(lastHeardTranscript.trim());
      } else if (queuedVoiceText.trim()) {
        flushQueuedVoiceText();
      }

      isListening = false;
      setListening(false);
      lastHeardTranscript = "";
      speechHadFinalResult = false;
    }
  };

  return recognizer;
}

function toggleListen() {
  if (isListening) {
    stopListening();
    return;
  }
  startListening();
}

async function ensureMicAccess() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !isMobileSpeechMode()) {
    return true;
  }

  var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach(function(track) {
    track.stop();
  });
  return true;
}

async function startListening() {
  clearTimeout(micRetryTimer);
  micRetryTimer = null;

  try {
    await ensureMicAccess();
  } catch (error) {
    showToast("Mic permission allow karein", "err");
    return;
  }

  if (!recognition || isMobileSpeechMode()) {
    recognition = initSpeech();
  }
  if (!recognition) {
    return;
  }

  lastHeardTranscript = "";
  speechHadFinalResult = false;
  clearTimeout(queuedVoiceTimer);
  queuedVoiceTimer = null;
  queuedVoiceText = "";

  try {
    recognition.start();
  } catch (error) {
    if (isMobileSpeechMode() && micRetryCount < 1) {
      recognition = null;
      micRetryCount += 1;
      micRetryTimer = setTimeout(function() {
        startListening();
      }, 220);
      return;
    }

    recognition = null;
    micRetryCount = 0;
    showToast("Mic restart karke try karein", "err");
    return;
  }

  micRetryCount = 0;
  isListening = true;
  setListening(true);
}

function stopListening() {
  if (recognition) {
    try {
      recognition.stop();
    } catch (error) {}
  }

  isListening = false;
  micRetryCount = 0;
  clearTimeout(micRetryTimer);
  micRetryTimer = null;
  clearTimeout(queuedVoiceTimer);
  queuedVoiceTimer = null;
  queuedVoiceText = "";
  lastHeardTranscript = "";
  speechHadFinalResult = false;
  setListening(false);
  setTranscript("", "");
}

function setListening(isActive) {
  var button = document.getElementById("micBtn");
  var status = document.getElementById("micStatus");
  var micZone = document.getElementById("micZone");
  var transcriptField = document.getElementById("transcriptField");

  button.classList.toggle("active", isActive);
  micZone.classList.toggle("listening", isActive);
  transcriptField.classList.toggle("active", isActive);
  status.classList.toggle("active", isActive);
  status.textContent = isActive
    ? "\u0938\u0941\u0928 \u0930\u0939\u093E \u0939\u0942\u0902\u2026 \u092C\u094B\u0932\u093F\u090F"
    : "\u092C\u094B\u0932\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0926\u092C\u093E\u090F\u0902";
}

function setTranscript(interim, final) {
  var transcriptEl = document.getElementById("transcriptEl");

  if (interim) {
    transcriptEl.innerHTML = '<span class="tr-interim">' + interim + "</span>";
    return;
  }

  if (final) {
    transcriptEl.innerHTML = '<span class="tr-final">' + final + "</span>";
    setTimeout(function() {
      transcriptEl.innerHTML = '<span class="tr-ph">' + TRANSCRIPT_PLACEHOLDER + "</span>";
    }, 2500);
    return;
  }

  transcriptEl.innerHTML = '<span class="tr-ph">' + TRANSCRIPT_PLACEHOLDER + "</span>";
}

function showParsing(show) {
  document.getElementById("parsingIndicator").classList.toggle("is-visible", show);
}

function isMobileSpeechMode() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.matchMedia("(pointer: coarse)").matches;
}

function isVoiceCommandText(text) {
  var normalizedText = text.toLowerCase().trim();

  return [
    "ho gaya", "hogaya", "bill bana", "bill banao", "total", "bas", "done", "complete", "khatam", "finish",
    "hatao", "hata do", "last hatao", "pichla hatao", "remove", "undo", "wapas", "delete",
    "sab hatao", "clear karo", "sab delete"
  ].some(function(command) {
    return normalizedText.includes(command);
  });
}

function queueVoiceText(text) {
  queuedVoiceText = queuedVoiceText ? queuedVoiceText + " " + text : text;
  clearTimeout(queuedVoiceTimer);
  queuedVoiceTimer = setTimeout(function() {
    flushQueuedVoiceText();
  }, isMobileSpeechMode() ? 900 : 250);
}

async function flushQueuedVoiceText() {
  clearTimeout(queuedVoiceTimer);
  queuedVoiceTimer = null;

  if (isVoiceProcessing || !queuedVoiceText.trim()) {
    return;
  }

  var textToProcess = queuedVoiceText.trim();
  queuedVoiceText = "";
  isVoiceProcessing = true;

  try {
    await processVoice(textToProcess);
  } finally {
    isVoiceProcessing = false;
    if (queuedVoiceText.trim()) {
      flushQueuedVoiceText();
    }
  }
}

function handleFinalTranscript(text) {
  if (isVoiceCommandText(text)) {
    if (queuedVoiceText.trim()) {
      flushQueuedVoiceText().then(function() {
        processVoice(text);
      });
    } else {
      processVoice(text);
    }
    return;
  }

  queueVoiceText(text);
}

async function parseWithGemini(text) {
  var productList = PRODUCTS.map(function(product) {
    return product.displayName + "|aliases:" + product.names.join(",") + "|defaultPrice:" + product.price + "/" + product.unit;
  }).join("\n");

  var prompt = "You are a kirana shop billing assistant in India. Parse Hindi/English speech into bill items.\n\n"
    + "Products (for fuzzy name matching only):\n" + productList + "\n\n"
    + "Hindi numbers: ek=1,do=2,teen=3,char=4,paanch=5,chhe=6,saat=7,aath=8,nau=9,das=10,barah=12,pandrah=15,bees=20,tees=30,pachaas=50,sau=100\n"
    + "Hindi fractions: aadha=0.5,paav=0.25,sawa=1.25,dedh=1.5,dhai=2.5,chataak=0.05\n"
    + "Units: kilo/kg, gram/gm/g, liter/litre/l, ml, piece/pcs, packet/pack/pkt, dozen, box, bottle, pouch, bag, can, tin\n\n"
    + "Speech: \"" + text + "\"\n\n"
    + "=== CRITICAL PRICING RULES ===\n\n"
    + "RULE 1 - WALA/WALI MEANS PER-UNIT RATE:\n"
    + "If a user says 'X wala', 'X wali', 'X rupay wala', 'X rupay wali', 'Rs X wala', or 'Rs X wali', X is the PER-UNIT RATE, not total.\n"
    + "This applies to kg/gm/liter/ml items as well as piece items.\n"
    + "This is a GENERAL rule for any numeric value, not only the examples below. 1 wala, 1 wali, 7 wala, 30 wali, 83 wala, 180 wali, 999 wala all mean per-unit rate.\n"
    + "- \"gehun 5 kg 30 rupay wala\" means qty:5, unit:kg, rate:30, total:150\n"
    + "- \"chawal 50 wala 5kg\" means qty:5, unit:kg, rate:50, total:250\n"
    + "- \"chawal 5kg 50 wala\" means qty:5, unit:kg, rate:50, total:250\n"
    + "- \"chawal 6 kg 60 wali\" means qty:6, unit:kg, rate:60, total:360\n"
    + "- \"toor daal 2 kilo 100 wala\" means qty:2, unit:kg, rate:100, total:200\n"
    + "- \"5kg toor daal 120 wali\" means qty:5, unit:kg, rate:120, total:600\n"
    + "- \"teen Parle-G 10 wala\" means qty:3, unit:piece, rate:10, total:30\n\n"
    + "RULE 2 - KA/KI MEANS TOTAL PRICE:\n"
    + "If a user says 'X ka', 'X ki', 'X rupay ka', or 'X rupay ki', X is the TOTAL price for that line item, not rate.\n"
    + "This is a GENERAL rule for any numeric value, not only the examples below. 5 ka, 5 ki, 30 ka, 30 ki, 111 ka, 250 ki all mean total price.\n"
    + "- \"chawal 5kg 30 ka\" means qty:5, unit:kg, rate:null, total:30\n"
    + "- \"chawal 5kg 30 ki\" means qty:5, unit:kg, rate:null, total:30\n"
    + "- \"ajwain 10 ka\" means qty:1, unit:gm, rate:null, total:10\n"
    + "- \"namak 20 rupay ka\" means qty:1, unit:kg, rate:null, total:20\n\n"
    + "RULE 3 - PRICE WITHOUT WALA OR KA:\n"
    + "When a user says a price with quantity but does NOT say 'wala', treat that spoken price as TOTAL, not rate.\n"
    + "- \"5 kg aata 170 rupay\" means qty:5, unit:kg, rate:null, total:170\n"
    + "- \"50 gram jeera 20 rupay\" means qty:50, unit:gm, rate:null, total:20\n"
    + "- \"ajwain 10 rupay\" means qty:1, unit:gm, rate:null, total:10\n"
    + "- \"2 kilo chini 90 rupay\" means qty:2, unit:kg, rate:null, total:90\n"
    + "- \"namak 20 rupay\" means qty:1, unit:kg, rate:null, total:20\n\n"
    + "RULE 4 - DISTINCT VARIANTS BY PRICE:\n"
    + "If the same base product is spoken again with a different explicit rate or a different explicit total, it is a DIFFERENT line item and must NOT be merged.\n"
    + "This rule applies to ALL products, not only chawal. Examples: chawal, gehun, sabun, toor daal, namak, chini, oil, biscuit, anything.\n"
    + "Keep displayName clean and product-only. Do NOT add price text, brackets, '/kg', '/piece', or 'Rs total' inside displayName.\n"
    + "Do NOT assume the price numbers are fixed. The spoken numeric value can be ANY number and must be preserved in rate/total fields only.\n"
    + "- \"chawal 50 wala 5kg\" => displayName:\"Chawal\", rate:50\n"
    + "- \"chawal 5kg 50 wali\" => displayName:\"Chawal\", rate:50\n"
    + "- \"chawal 60 wala 5kg\" => displayName:\"Chawal\", rate:60\n"
    + "- \"toor daal 5kg 120 wala\" => displayName:\"Toor Daal\", rate:120\n"
    + "- \"chawal 30 ka\" => displayName:\"Chawal\", total:30\n"
    + "- \"chawal 5kg 30 ki\" => displayName:\"Chawal\", total:30\n"
    + "- \"sabun 30 rupay\" => displayName:\"Sabun\", total:30\n"
    + "- \"sabun 180 rupay\" => displayName:\"Sabun\", total:180\n"
    + "- \"toor daal 100 wala\" => displayName:\"Toor Daal\", rate:100\n"
    + "If two rows have different explicit rates or totals, return them as separate array entries.\n\n"
    + "RULE 5 - No price mentioned: Set rate to defaultPrice, total = qty * defaultPrice.\n\n"
    + "Return ONLY a valid JSON array. No markdown, no extra text.\n"
    + "Format: [{\"displayName\":\"Chini\",\"qty\":2,\"unit\":\"kg\",\"rate\":null,\"total\":90,\"isCustom\":false,\"priceType\":\"total\"}]\n"
    + "- rate: number if per-unit price, null if price was spoken as total\n"
    + "- total: always a number\n"
    + "- isCustom: true for unknown products\n"
    + "- priceType: 'rate' if spoken with wala, 'total' if spoken with ka or explicit total price, 'default' if no spoken price and default catalog price was used\n"
    + "- Ignore fillers: aur, bhi, ruk, haan, ok, bhai, please";

  try {
    showParsing(true);

    var response = await fetch("/.netlify/functions/parse-gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });

    var data = await response.json();
    showParsing(false);

    if (!response.ok || data.error) {
      throw new Error((data && data.error) || "Parser service failed");
    }

    return normalizeParsedItems(data);
  } catch (error) {
    showParsing(false);
    console.error(error);
    showToast("Parsing failed: " + (error && error.message ? error.message : "Gemini error"), "err");
    return [];
  }
}

function cleanDisplayName(displayName) {
  return String(displayName || "")
    .replace(/\s*\((?:Rs)?[^)]*\)\s*$/i, "")
    .trim();
}

function normalizeParsedItems(items) {
  return (items || []).map(function(item) {
    var normalizedItem = Object.assign({}, item);
    normalizedItem.displayName = cleanDisplayName(normalizedItem.displayName);
    return normalizedItem;
  });
}

async function processVoice(text) {
  var normalizedText = text.toLowerCase().trim();

  if (["ho gaya", "hogaya", "bill bana", "bill banao", "total", "bas", "done", "complete", "khatam", "finish"].some(function(command) {
    return normalizedText.includes(command);
  })) {
    finalizeBill();
    return;
  }

  if (["hatao", "hata do", "last hatao", "pichla hatao", "remove", "undo", "wapas", "delete"].some(function(command) {
    return normalizedText.includes(command);
  })) {
    if (billItems.length > 0) {
      var removed = billItems.pop();
      renderBill();
      showToast("Removed: " + removed.displayName, "info");
    }
    return;
  }

  if (["sab hatao", "clear karo", "sab delete"].some(function(command) {
    return normalizedText.includes(command);
  })) {
    clearBill();
    return;
  }

  var items = await parseWithGemini(text);
  if (items && items.length > 0) {
    items.forEach(addItem);
    renderBill();
    showToast(items.length + " item" + (items.length > 1 ? "s" : "") + " added \u2713", "ok");
  }
}
