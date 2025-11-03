// bot.js - GYAN GANGA BOT v10.0 ULTIMATE PRO
// ✅ CTA Buttons + Author Name + Smart Indian Tone + Error Free

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const fs = require("fs-extra");
const xlsx = require("xlsx");
const readline = require("readline");
const config = require("./config");

// ==================== GLOBAL STATE ====================
let pincodeData = [];
let orders = [];
let sessions = {};
let reminderIntervals = {};
let blockedUsers = [];

const ADMIN_NUMBER = "919174406375@s.whatsapp.net";
const WHATSAPP_GROUP = "https://chat.whatsapp.com/LcTW8DuZzV23uhVc7BBcAu?mode=wwt";
const AUTHOR = "संत रामपाल जी महाराज";

// ==================== BOOKS CONFIG ====================
const BOOKS = {
  "gyan-ganga": {
    name: { hi: "ज्ञान गंगा", en: "Gyan Ganga" },
    author: AUTHOR,
    description: {
      hi: `📚 *ज्ञान गंगा*

✍️ लेखक: ${AUTHOR}
📖 सभी धर्मों के पवित्र शास्त्रों से प्रमाणित ज्ञान`,
      en: `📚 *Gyan Ganga*

✍️ Author: ${AUTHOR}
📖 Spiritual knowledge verified from all sacred scriptures`,
    },
    pdf: {
      hi: "https://www.jagatgururampalji.org/hi/publications/gyan-ganga/",
      en: "https://books.jagatgururampalji.org",
    },
  },
  "jeene-ki-raah": {
    name: { hi: "जीने की राह", en: "Jeene Ki Raah" },
    author: AUTHOR,
    description: {
      hi: `📚 *जीने की राह*

✍️ लेखक: ${AUTHOR}
📖 सर्वश्रेष्ठ जीवन यापन के तरीके`,
      en: `📚 *Jeene Ki Raah*

✍️ Author: ${AUTHOR}
📖 Best ways to live a meaningful life`,
    },
    pdf: {
      hi: "https://www.jagatgururampalji.org/hi/publications/jeene-ki-rah/",
      en: "https://books.jagatgururampalji.org",
    },
  },
};

// ==================== SMART INPUT DETECTION ====================
function detectYes(txt) {
  const t = txt.toLowerCase().trim();
  return t.match(/^(yes|YES|Yes|Y|y|1|ha|HA|Ha|हा|ह्या|हाँ|हाँ|जी|जी|ठीक|ok|OK|Ok|確認|👍)$/);
}

function detectNo(txt) {
  const t = txt.toLowerCase().trim();
  return t.match(/^(no|NO|No|N|n|2|nahi|NAHI|Nahi|नहीं|नहीं|नहिं|na|NA|Na|😢)$/);
}

function detectBack(txt) {
  const t = txt.toLowerCase().trim();
  return t.match(/^(back|BACK|Back|menu|MENU|Menu|home|HOME|Home)$/);
}

function detectLanguage(text) {
  if (text.match(/[ा-ौं-ः]/g)) return "hi";
  return "en";
}

// ==================== LOAD DATA ====================
async function loadData() {
  try {
    if (fs.existsSync("./data/pincode.json")) {
      pincodeData = JSON.parse(fs.readFileSync("./data/pincode.json"));
      log(`📍 ${pincodeData.length} pincodes`);
    }
    if (fs.existsSync("./data/orders.json")) {
      orders = JSON.parse(fs.readFileSync("./data/orders.json"));
      log(`📦 ${orders.length} orders`);
    }
    if (fs.existsSync("./data/blocked-users.json")) {
      blockedUsers = JSON.parse(fs.readFileSync("./data/blocked-users.json"));
    }
  } catch (e) {
    error("Load failed", e);
  }
}

// ==================== UTILS ====================
function log(m) {
  console.log(`[${new Date().toLocaleTimeString("en-IN")}] ✅ ${m}`);
}

function error(msg, e) {
  console.error(`[${new Date().toLocaleTimeString("en-IN")}] ❌ ${msg}`, e?.message || "");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const validatePhone = p => /^[6-9]d{9}$/.test(p.replace(/D/g, ""));
const validatePincode = p => /^d{6}$/.test(p.replace(/D/g, ""));
const generateOrderId = () => "ORD" + Date.now().toString().slice(-8);
const getVillages = pin => pincodeData.filter(e => (e.pincode || e.Pincode) === pin).slice(0, 5);

function checkDuplicate(phone) {
  return orders.find(o => o.phone === phone);
}

function question(q) {
  return new Promise(r => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, a => { rl.close(); r(a); });
  });
}

// ==================== SAVE/UPDATE ====================
async function saveOrder(order) {
  orders.push(order);
  fs.writeFileSync("./data/orders.json", JSON.stringify(orders, null, 2));
}

async function blockUser(jid) {
  if (!blockedUsers.includes(jid)) {
    blockedUsers.push(jid);
    fs.writeFileSync("./data/blocked-users.json", JSON.stringify(blockedUsers, null, 2));
  }
}

async function unblockUser(jid) {
  blockedUsers = blockedUsers.filter(u => u !== jid);
  fs.writeFileSync("./data/blocked-users.json", JSON.stringify(blockedUsers, null, 2));
}

// ==================== SEND BUTTONS ====================
async function sendButtons(sock, jid, text, buttons, footer = "") {
  try {
    const msg = {
      text: text,
      footer: footer || "",
      buttons: buttons.map((btn, i) => ({
        buttonId: btn.id || `btn_${i}`,
        buttonText: { displayText: btn.text },
        type: 1,
      })),
      headerType: 1,
    };

    await sock.sendMessage(jid, msg);
  } catch (e) {
    const fallback = text + "

" + buttons.map((b, i) => `${i + 1}. ${b.text}`).join("
");
    await sock.sendMessage(jid, { text: fallback });
  }
}

// ==================== SEND PDF LINK ====================
async function sendPDFLink(sock, jid, book, lang) {
  try {
    const bookData = BOOKS[book];
    const pdfLink = bookData.pdf[lang] || bookData.pdf.en;
    const bookName = bookData.name[lang];
    const authorName = bookData.author;

    const pdfMsg = lang === "hi"
      ? `📖 *${bookName}*

✍️ लेखक: ${authorName}

🔗 PDF Link:
${pdfLink}

📥 ऊपर दिए गए लिंक से डाउनलोड करें`
      : `📖 *${bookName}*

✍️ Author: ${authorName}

🔗 PDF Link:
${pdfLink}

📥 Download from the link above`;

    await sock.sendMessage(jid, { text: pdfMsg });
  } catch (e) {
    error("PDF send failed", e);
  }
}

// ==================== SEND GROUP LINK ====================
async function sendGroupLink(sock, jid, lang) {
  try {
    const groupMsg = lang === "hi"
      ? `👥 *व्हाट्सएप ग्रुप जॉइन करें*

🔗 ${WHATSAPP_GROUP}

अधिक किताबें और अपडेट के लिए हमारे ग्रुप को फॉलो करें`
      : `👥 *Join WhatsApp Group*

🔗 ${WHATSAPP_GROUP}

Follow our group for more books and updates`;

    await sock.sendMessage(jid, { text: groupMsg });
  } catch (e) {
    error("Group link send failed", e);
  }
}

// ==================== DELIVERY INFO ====================
async function sendDeliveryInfo(sock, jid, lang) {
  const msg = lang === "hi"
    ? `📦 *डिलीवरी की जानकारी*

✅ 20-30 दिन में आपके घर तक पहुंच जाएगी
✅ *पूरी तरह निःशुल्क डिलीवरी*
✅ भारत के सभी शहरों में डिलीवरी
✅ डिजिटल PDF अभी तुरंत भेज दी गई है

📚 लेखक: ${AUTHOR}`
    : `📦 *Delivery Information*

✅ Will arrive at your home in 20-30 days
✅ *Completely FREE delivery*
✅ Delivery to all Indian cities
✅ Digital PDF sent immediately

📚 Author: ${AUTHOR}`;

  await sock.sendMessage(jid, { text: msg });
}

// ==================== SHOW PREVIOUS ORDER ====================
async function showPreviousOrder(sock, jid, phone, lang) {
  try {
    const prevOrder = orders.find(o => o.phone === phone);
    if (prevOrder) {
      const orderDate = new Date(prevOrder.time).toLocaleString("en-IN");
      const msg = lang === "hi"
        ? `⚠️ *आप पहले से ऑर्डर कर चुके हैं!*

🆔 Order ID: ${prevOrder.orderId}
📚 किताब: ${prevOrder.book}
📍 गांव: ${prevOrder.village}
⏰ तारीख: ${orderDate}

❌ एक नंबर से एक ही बार ऑर्डर किया जा सकता है।

✅ आपकी किताब 20-30 दिन में आ जाएगी।`
        : `⚠️ *You already have an order!*

🆔 Order ID: ${prevOrder.orderId}
📚 Book: ${prevOrder.book}
📍 Village: ${prevOrder.village}
⏰ Date: ${orderDate}

❌ Only one order per number allowed.

✅ Your book will arrive in 20-30 days.`;

      await sock.sendMessage(jid, { text: msg });
      return true;
    }
    return false;
  } catch (e) {
    error("Duplicate check failed", e);
    return false;
  }
}

// ==================== FORWARD TO ADMIN ====================
async function forwardToAdmin(sock, order) {
  try {
    const msg = `
📦 *नया ऑर्डर आया*

🆔 Order ID: ${order.orderId}
👤 नाम: ${order.name}
📱 नंबर: ${order.phone}
📚 किताब: ${order.book}
📍 गांव: ${order.village}
🌍 जिला: ${order.district}
📮 PIN: ${order.pin}
⏰ समय: ${new Date(order.time).toLocaleString("en-IN")}
    `;
    await sock.sendMessage(ADMIN_NUMBER, { text: msg });
    log(`📤 Order forwarded to admin`);
  } catch (e) {
    error("Forward failed", e);
  }
}

// ==================== HOURLY REMINDER ====================
function startReminder(sock, jid, lang) {
  if (reminderIntervals[jid]) clearInterval(reminderIntervals[jid]);

  reminderIntervals[jid] = setInterval(async () => {
    try {
      if (sessions[jid]?.step !== "menu" && sessions[jid]?.step !== "confirm_order") {
        const reminderMsg = lang === "hi"
          ? `⏰ *स्मरण*

अभी तक आपका ऑर्डर पूरा नहीं हुआ।

कृपया अपनी जानकारी भेजकर ऑर्डर कन्फर्म करें।

अगर आप बंद करना चाहते हैं तो *STOP* या */STOP* लिखें।`
          : `⏰ *Reminder*

Your order is not yet confirmed.

Please send your details to complete the order.

If you want to stop, type *STOP* or */STOP*`;

        await sock.sendMessage(jid, { text: reminderMsg });
        log(`📢 Reminder sent`);
      }
    } catch (e) {
      error("Reminder failed", e);
    }
  }, 60 * 60 * 1000); // 1 घण्टे में
}

// ==================== MAIN BOT ====================
async function startBot(sessionFolder, id) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys) },
      keepAliveIntervalMs: 30000,
    });

    sock.ev.on("creds.update", saveCreds);

    // Pairing
    if (!state.creds.registered) {
      const phone = await question(`📱 Bot${id} WhatsApp: `);
      const code = await sock.requestPairingCode(phone.trim());
      log(`🔐 Code: ${code}`);
    }

    // Connection
    sock.ev.on("connection.update", async (u) => {
      const { connection, lastDisconnect } = u;
      if (connection === "close") {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
          await sleep(5000);
          startBot(sessionFolder, id);
        }
      } else if (connection === "open") {
        log(`✅ Bot${id} Online!`);
      }
    });

    // Messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (let m of messages) {
        if (m.key.fromMe) continue;

        let jid = m.key.remoteJid;
        let txt = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").trim();
        let name = m.pushName || "User";

        if (blockedUsers.includes(jid)) continue;

        log(`📩 ${name}: ${txt.substring(0, 40)}`);

        // STOP/Disable
        if (detectBack(txt) || txt.match(/^(STOP|stop|/STOP|/stop|Stop)$/)) {
          if (txt.match(/^(STOP|stop|/STOP|/stop|Stop)$/)) {
            await blockUser(jid);
            if (reminderIntervals[jid]) clearInterval(reminderIntervals[jid]);
            delete sessions[jid];

            const stopMsg = detectLanguage(txt) === "hi"
              ? `🛑 *बॉट बंद हो गया*

आप भविष्य में किसी भी संदेश से बॉट को फिर से शुरू कर सकते हैं।`
              : `🛑 *Bot Stopped*

You can restart the bot by sending any message later.`;

            await sock.sendMessage(jid, { text: stopMsg });
            continue;
          } else {
            // Back to menu
            if (sessions[jid]) {
              sessions[jid].step = "menu";
              const msg = detectLanguage(txt) === "hi" ? `📱 *मेनू*` : `📱 *Menu*`;
              await sendButtons(sock, jid, msg, [
                { id: "start_order", text: "📚 नई ऑर्डर शुरू करें" },
              ]);
            }
            continue;
          }
        }

        // START/Resume
        if (txt.match(/^(START|start|/START|/start|hi|hello|नमस्ते)$/i)) {
          await unblockUser(jid);
          const lang = detectLanguage(txt);
          sessions[jid] = { step: "confirm_order", lang, data: {} };

          const confirmMsg = lang === "hi"
            ? `📚 *क्या आप संत रामपाल जी महाराज जी की ज्ञान गंगा या जीने की राह पुस्तक निःशुल्क प्राप्त करना चाहते हैं?*

📖 यह पुस्तक पूर्ण रूप से निःशुल्क भेजी जायगी।
✍️ लेखक: ${AUTHOR}

(आप "हाँ" या "नहीं" या 1 या 2 लिखकर उत्तर दे सकते हैं)`
            : `📚 *Do you want to receive the books "Gyan Ganga" or "Jeene Ki Raah" by ${AUTHOR} completely free?*

📖 These books will be sent completely free.
✍️ Author: ${AUTHOR}

(You can answer by typing "Yes" or "No" or 1 or 2)`;

          await sendButtons(sock, jid, confirmMsg, [
            { id: "yes_order", text: lang === "hi" ? "✅ हाँ, चाहिए" : "✅ Yes, I want" },
            { id: "no_order", text: lang === "hi" ? "❌ नहीं, धन्यवाद" : "❌ No, Thank you" },
          ]);

          startReminder(sock, jid, lang);
          continue;
        }

        // Auto-initialize
        if (!sessions[jid]) {
          const lang = detectLanguage(txt);
          sessions[jid] = { step: "confirm_order", lang, data: {} };
          startReminder(sock, jid, lang);

          const confirmMsg = lang === "hi"
            ? `📚 *क्या आप संत रामपाल जी महाराज जी की ज्ञान गंगा या जीने की राह पुस्तक निःशुल्क प्राप्त करना चाहते हैं?*

📖 यह पुस्तक पूर्ण रूप से निःशुल्क भेजी जायगी।
✍️ लेखक: ${AUTHOR}`
            : `📚 *Do you want to receive the books "Gyan Ganga" or "Jeene Ki Raah" by ${AUTHOR} completely free?*

📖 These books will be sent completely free.
✍️ Author: ${AUTHOR}`;

          await sendButtons(sock, jid, confirmMsg, [
            { id: "yes_order", text: lang === "hi" ? "✅ हाँ, चाहिए" : "✅ Yes" },
            { id: "no_order", text: lang === "hi" ? "❌ नहीं, धन्यवाद" : "❌ No" },
          ]);
          continue;
        }

        const lang = sessions[jid].lang;

        // YES Detection
        if (sessions[jid].step === "confirm_order") {
          if (detectYes(txt) || txt === "yes_order") {
            sessions[jid].step = "select_book";
            const msg = lang === "hi"
              ? `📚 *कौन सी पुस्तक चाहिए?*`
              : `📚 *Which book do you want?*`;

            await sendButtons(sock, jid, msg, [
              { id: "gyan_ganga", text: "📚 ज्ञान गंगा" },
              { id: "jeene_ki_raah", text: "📚 जीने की राह" },
            ]);
            continue;
          }

          if (detectNo(txt) || txt === "no_order") {
            const msg = lang === "hi"
              ? `🙏 धन्यवाद! आप भविष्य में हमसे जुड़ सकते हैं।`
              : `🙏 Thank you! You can join us anytime in the future.`;

            await sock.sendMessage(jid, { text: msg });
            delete sessions[jid];
            if (reminderIntervals[jid]) clearInterval(reminderIntervals[jid]);
            continue;
          }
        }

        // Book selection
        if (sessions[jid].step === "select_book") {
          if (txt === "gyan_ganga" || txt.match(/gyan|ज्ञान/i)) {
            sessions[jid].data.book = "gyan-ganga";
            sessions[jid].step = "await_pincode";

            const bookData = BOOKS["gyan-ganga"];
            await sock.sendMessage(jid, { text: bookData.description[lang] });
            await sleep(1000);

            const msg = lang === "hi"
              ? `📍 अपना 6 अंकों का PIN कोड डालें:

(उदाहरण: 452001)`
              : `📍 Enter your 6-digit PIN code:

(Example: 452001)`;

            await sock.sendMessage(jid, { text: msg });
            continue;
          }

          if (txt === "jeene_ki_raah" || txt.match(/jeene|जीने/i)) {
            sessions[jid].data.book = "jeene-ki-raah";
            sessions[jid].step = "await_pincode";

            const bookData = BOOKS["jeene-ki-raah"];
            await sock.sendMessage(jid, { text: bookData.description[lang] });
            await sleep(1000);

            const msg = lang === "hi"
              ? `📍 अपना 6 अंकों का PIN कोड डालें:`
              : `📍 Enter your 6-digit PIN code:`;

            await sock.sendMessage(jid, { text: msg });
            continue;
          }
        }

        // PIN
        if (sessions[jid].step === "await_pincode") {
          const pin = txt.replace(/D/g, "");
          if (!validatePincode(pin)) {
            const msg = lang === "hi" ? "❌ कृपया 6 अंक डालें!" : "❌ Please enter 6 digits!";
            await sock.sendMessage(jid, { text: msg });
            continue;
          }

          const villages = getVillages(pin);
          if (!villages.length) {
            const msg = lang === "hi" ? "❌ यह PIN नहीं मिला!" : "❌ PIN not found!";
            await sock.sendMessage(jid, { text: msg });
            continue;
          }

          sessions[jid].data.pin = pin;
          sessions[jid].data.villages = villages;

          const villageButtons = villages.map((v, i) => ({
            id: `village_${i}`,
            text: v.office_name.substring(0, 18),
          }));

          const msg = lang === "hi" ? "📍 *अपना गांव चुनें:*" : "📍 *Select your village:*";
          await sendButtons(sock, jid, msg, villageButtons);
          sessions[jid].step = "await_village";
          continue;
        }

        // Village
        if (sessions[jid].step === "await_village") {
          const match = txt.match(/village_(d+)/);
          const num = parseInt(txt);

          if (match || (num > 0 && num <= sessions[jid].data.villages.length)) {
            const idx = match ? parseInt(match[1]) : num - 1;
            const villages = sessions[jid].data.villages;

            if (villages[idx]) {
              sessions[jid].data.village = villages[idx];
              const msg = lang === "hi" ? "👤 *अपना पूरा नाम डालें:*" : "👤 *Enter your full name:*";
              await sock.sendMessage(jid, { text: msg });
              sessions[jid].step = "await_name";
            }
          } else {
            const msg = lang === "hi" ? "❌ गलत चुनाव!" : "❌ Invalid!";
            await sock.sendMessage(jid, { text: msg });
          }
          continue;
        }

        // Name
        if (sessions[jid].step === "await_name") {
          if (txt.length < 2) {
            const msg = lang === "hi" ? "❌ कम से कम 2 अक्षर डालें!" : "❌ Enter at least 2 characters!";
            await sock.sendMessage(jid, { text: msg });
            continue;
          }
          sessions[jid].data.name = txt;
          const msg = lang === "hi" ? "📱 *मोबाइल नंबर (10 अंक):*" : "📱 *Mobile number (10 digits):*";
          await sock.sendMessage(jid, { text: msg });
          sessions[jid].step = "await_mobile";
          continue;
        }

        // Mobile
        if (sessions[jid].step === "await_mobile") {
          const phone = txt.replace(/D/g, "");
          if (!validatePhone(phone)) {
            const msg = lang === "hi" ? "❌ कृपया 10 अंक डालें!" : "❌ Please enter 10 digits!";
            await sock.sendMessage(jid, { text: msg });
            continue;
          }

          // CHECK DUPLICATE
          const isDuplicate = checkDuplicate(phone);
          if (isDuplicate) {
            await showPreviousOrder(sock, jid, phone, lang);
            sessions[jid] = { step: "menu", lang, data: {} };
            continue;
          }

          // Create Order
          const d = sessions[jid].data;
          const orderId = generateOrderId();
          const order = {
            orderId,
            book: d.book,
            name: d.name,
            phone,
            pin: d.pin,
            village: d.village.office_name,
            district: d.village.district,
            lang,
            time: new Date().toISOString(),
          };

          await saveOrder(order);
          if (reminderIntervals[jid]) clearInterval(reminderIntervals[jid]);

          // Success
          const bookName = BOOKS[d.book].name[lang];
          const successMsg = lang === "hi"
            ? `✅ *आपका ऑर्डर पूरा हुआ!*

📚 किताब: ${bookName}
👤 नाम: ${d.name}
📍 गांव: ${d.village.office_name}
📱 नंबर: ${phone}
🆔 Order ID: ${orderId}

✍️ लेखक: ${AUTHOR}`
            : `✅ *Your Order is Confirmed!*

📚 Book: ${bookName}
👤 Name: ${d.name}
📍 Village: ${d.village.office_name}
📱 Number: ${phone}
🆔 Order ID: ${orderId}

✍️ Author: ${AUTHOR}`;

          await sock.sendMessage(jid, { text: successMsg });

          // Delivery info
          await sleep(1000);
          await sendDeliveryInfo(sock, jid, lang);

          // Send PDF
          await sleep(1000);
          await sendPDFLink(sock, jid, d.book, lang);

          // Send Group
          await sleep(1000);
          await sendGroupLink(sock, jid, lang);

          // Forward
          await forwardToAdmin(sock, order);

          const finalMsg = lang === "hi"
            ? `📲 किसी भी सवाल के लिए हमारे ग्रुप में शामिल हों।`
            : `📲 Join our group for any questions.`;

          await sock.sendMessage(jid, { text: finalMsg });

          sessions[jid] = { step: "menu", lang, data: {} };
          continue;
        }
      }
    });
  } catch (e) {
    error(`Bot error`, e);
  }
}

// ==================== MAIN ====================
async function main() {
  log("🚀 Gyan Ganga Bot v10.0 Starting...");
  fs.ensureDirSync("./data");
  await loadData();

  for (let i = 0; i < config.SESSIONS.length; i++) {
    await startBot(config.SESSIONS[i], i + 1);
    await sleep(3000);
  }
}

main();

module.exports = { startBot, forwardToAdmin };
