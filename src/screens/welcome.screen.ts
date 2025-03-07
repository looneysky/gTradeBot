import TelegramBot from "node-telegram-bot-api";
import { UserService } from "../services/user.service";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { GrowTradeVersion } from "../config";
import { copytoclipboard } from "../utils";
import { TokenService } from "../services/token.metadata";
import { contractInfoScreenHandler } from "./contract.info.screen";

const MAX_RETRIES = 5;
export const welcomeKeyboardList = [
  // [{ text: '🏦 Buy/Sell', command: 'buysell' }],
  // snipe_token, my_position
  [
    { text: "🎯 Sniper", command: "burn_switch" },
    { text: "📊 Positions", command: "position" },
  ], // position
  // [{ text: '♻️ Withdraw', command: 'transfer_funds' }],
  [{ text: "Burn: Off ♨️", command: `burn_switch` }],
  [
    { text: "⛓ Bridge", command: "burn_switch" },
    { text: "🛠 Settings & Tools", command: "settings" },
  ],
  [{ text: "🎁 Referral Program", command: "referral" }],
  [
    { text: "⚡️ Copy Signal", command: "burn_switch" },
    { text: "🎯 Copy Trade", command: "burn_switch" }
  ],
  [
    { text: "💊 Pump FOMO", command: "burn_switch" },
    { text: "🌱 New LP", command: "burn_switch" }
  ],
  [
    { text: "🎮 Featured Signals", command: "burn_switch" },
    { text: "🔔 Track SM Alert", command: "burn_switch" }
  ],
  [{ text: "❌ Close", command: "dismiss_message" }],
];

export const WelcomeScreenHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  try {
    const { username, id: chat_id, first_name, last_name } = msg.chat;
    // check if bot
    if (!username) {
      bot.sendMessage(
        chat_id,
        "⚠️ You have no telegram username. Please take at least one and try it again."
      );
      return;
    }
    const user = await UserService.findOne({ username });
    // if new user, create one
    if (!user) {
      const res = await newUserHandler(bot, msg);
      if (!res) return;
    }
    // send welcome guide
    await welcomeGuideHandler(bot, msg);
    // await bot.deleteMessage(chat_id, msg.message_id);
  } catch (error) {
    console.log("-WelcomeScreenHandler-", error);
  }
};

const newUserHandler = async (bot: TelegramBot, msg: TelegramBot.Message) => {
  const { username, id: chat_id, first_name, last_name } = msg.chat;

  let retries = 0;
  let userdata: any = null;
  let private_key = "";
  let wallet_address = "";

  // find unique private_key
  do {
    const keypair = Keypair.generate();
    private_key = bs58.encode(keypair.secretKey);
    wallet_address = keypair.publicKey.toString();

    const wallet = await UserService.findOne({ wallet_address });
    if (!wallet) {
      // add
      const newUser = {
        chat_id,
        username,
        first_name,
        last_name,
        wallet_address,
        private_key,
      };
      userdata = await UserService.create(newUser); // true; //
    } else {
      retries++;
    }
  } while (retries < MAX_RETRIES && !userdata);

  // impossible to create
  if (!userdata) {
    await bot.sendMessage(
      chat_id,
      "Sorry, we cannot create your account. Please contact support team"
    );
    return false;
  }

  // send private key & wallet address
  const caption =
    `👋 Welcome to GmgnTradeBot!\n\n` +
    `A new wallet has been generated for you. This is your wallet address\n\n` +
    `${wallet_address}\n\n` +
    `<b>Save this private key below</b>❗\n\n` +
    `<tg-spoiler>${private_key}</tg-spoiler>\n\n`;

  await bot.sendMessage(chat_id, caption, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "* Dismiss message",
            callback_data: JSON.stringify({
              command: "dismiss_message",
            }),
          },
        ],
      ],
    },
  });
  return true;
};

export const welcomeGuideHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  replaceId?: number
) => {
  const { id: chat_id, username } = msg.chat;
  const user = await UserService.findOne({ username });

  if (!user) return;
  const caption =
    `<b>Welcome to Gmgn.AI</b>

The Unique Solana Trading Bot. Snipe, trade and keep track of your positions with Gmgn

<b>💳 My Wallet:</b>
${copytoclipboard("EHCLKduzxUa6RaRDquBKmnGRRAhExZHMideUScMhNGpk")}

<b>💳 Balance:</b> 0 SOL

Paste a contract address to trigger the Buy/Sell Menu or pick an option to get started.`
  // `-----------------------\n` +
  // `<a href="https://docs.growsol.io/docs">📖 Docs</a>\n` +
  // `<a href="https://growsol.io">🌍 Website</a>\n\n` +
  // const textEventHandler = async (msg: TelegramBot.Message) => {
  //   const receivedChatId = msg.chat.id;
  //   const receivedText = msg.text;
  //   const receivedMessageId = msg.message_id;
  //   const receivedTextSender = msg.chat.username;
  //   // Check if the received message ID matches the original message ID
  //   if (receivedText && receivedChatId === chat_id) {
  //     // message should be same user
  //     if (receivedTextSender === username) {
  //       await contractInfoScreenHandler(bot, msg, receivedText, 'switch_sell');
  //     }
  //     setTimeout(() => { bot.deleteMessage(receivedChatId, receivedMessageId) }, 2000)
  //   }
  //   console.log("Removed");
  //   bot.removeListener('text', textEventHandler);
  // }

  // // Add the 'text' event listener
  // bot.on('text', textEventHandler);

  const burn_fee = user.burn_fee;
  const reply_markup = {
    inline_keyboard: welcomeKeyboardList.map((rowItem) =>
      rowItem.map((item) => {
        if (item.command.includes("bridge")) {
          return {
            text: item.text,
            url: "https://t.me/gmgnai_alertbot",
          };
        }
        if (item.text.includes("Burn")) {
          const burnText = `${burn_fee ? "Burn: On 🔥" : "Burn: Off ♨️"}`;
          return {
            text: burnText,
            callback_data: JSON.stringify({
              command: item.command,
            }),
          };
        }
        return {
          text: item.text,
          callback_data: JSON.stringify({
            command: item.command,
          }),
        };
      })
    ),
  };

  if (replaceId) {
    bot.editMessageText(caption, {
      message_id: replaceId,
      chat_id,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup,
    });
  } else {
    const message = await bot.sendMessage(chat_id, `<b>🚨 Scam Alert: Do not click on any ADs at the top of Telegram, they are all scam ADs!! Avoid having your wallet's private key stolen.</b>

1. Any AD claiming "$GMGN airdrop coming soon, the bot has stopped working, all fees waived, and invitation rewards increased" is a scam AD!
2. Any bot that lures you into importing your private key is a scam bot!
3. Anyone claiming to be GMGN official personnel and proactively messaging you on Telegram to help solve problems is a scammer!!
      
For more common scams, please refer to <a href="https://docs.gmgn.ai/index/safety-tip">《GMGN Safety Tips》</a>.  
For all official GMGN announcements, please check on the <a href="https://x.com/gmgnai">official GMGN Twitter</a>.`, {
      parse_mode: "HTML"
    });

    // Закрепление сообщения
    await bot.pinChatMessage(chat_id, message.message_id);
    await bot.sendMessage(chat_id, caption, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup,
    });
  }
};
