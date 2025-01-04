import nodeTelegramBotApi from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import User from './model/User.js';
import connect from './config/db.config.js';
import { getUserResults, getRatings } from './service/rating.service.js';

dotenv.config();

const token = process.env.TOKEN || 'YOUR_BOT_TOKEN';
const admins = process.env.ADMINS?.split(',') || [];
const bot = new nodeTelegramBotApi(token, { polling: true });

// Guruhning ID sini o'zgartiring
const allowedChatId = -1002252190840; // 'ОНЛАЙН КОМПЮТЕР ХИЗМАТ 24/7' guruhining ID

connect();

// Adminlarga xabar yuborish uchun yordamchi funksiya
const notifyAdmins = (message) => {
  admins.forEach((adminId) => {
    bot.sendMessage(adminId, message, { parse_mode: 'HTML' });
  });
};

bot.on('new_chat_members', async (msg) => {
  bot.deleteMessage(msg.chat.id, msg.message_id);
  if (msg.chat.id !== allowedChatId) return; // Faqat kerakli guruhda ishlashi uchun tekshiruv

  try {
    const {
      from,
      chat,
      message_id: messageId,
      new_chat_members: newMembers,
    } = msg;

    let dbUser = await User.findOne({ userId: from.id });

    // Agar user bazada bo'lmasa, uni qo'shish
    if (!dbUser) {
      dbUser = await new User({
        userId: from.id,
        firstName: from.first_name || 'Unknown', // Ensure first_name is set
      }).save();
    }
    if (msg.from.id !== msg.new_chat_members[0].id) {
      const members = newMembers.filter(({ is_bot }) => !is_bot);
      const bots = newMembers.filter(({ is_bot }) => is_bot);

      // Botlarni guruhdan haydash
      for (const botMember of bots) {
        await bot.kickChatMember(chat.id, botMember.id);
      }

      // Yangi foydalanuvchilarni bazaga qo'shish
      for (const member of members) {
        if (!member.id) {
          continue;
        }

        const existingUser = await User.findOne({ userId: member.id });
        if (!existingUser) {
          const newMember = new User({
            userId: member.id,
            firstName: member.first_name || 'Unknown', // Ensure first_name is set
          });
          try {
            await newMember.save();
          } catch (saveError) {
            console.error(
              `Foydalanuvchini saqlashda xatolik: ${saveError.message}`
            );
          }
        }
      }

      // Foydalanuvchining qo'shgan a'zolari ro'yxatini yangilash
      dbUser.addedUsers.push(...members.map(({ id }) => id));
      await dbUser.save();

      // Adminlarga xabar yuborish
      members.forEach(async (member) => {
        const userProfileLink = `tg://user?id=${member.username || member.id}`;
        const fromProfileLink = `tg://user?id=${from.username || from.id}`;
        const adminMessage = `✨ <a href="${fromProfileLink}">${
          from.first_name
        }</a> <a href="${userProfileLink}">${
          member.first_name
        }</a>ni guruhga qo'shdi! \n\n🎯 <a href="${fromProfileLink}">${
          from.first_name
        }</a>: <b>${await getUserResults(
          from.id
        )}</b> ta foydalanuvchi qo'shgan`;
        notifyAdmins(adminMessage);
      });
    } else {
      const userProfileLink = `tg://user?id=${from.username || from.id}`;
      const adminMessage = `✨ <a href="${userProfileLink}">${from.first_name}${
        from.last_name ? ` ${from.last_name}` : ''
      }</a> guruhga qayta qo'shildi! \n\n🎯 <a href="${userProfileLink}">${
        from.first_name
      }</a>: ${await getUserResults(from.id)} ta foydalanuvchi qo'shgan`;
      notifyAdmins(adminMessage);
    }
  } catch (error) {
    console.error("Yangi a'zolarni qo'shishda xatolik:", error);
  }
});

// Guruhdan chiqib ketgan a'zolarni qayta ishlash
bot.on('left_chat_member', async (msg) => {
  if (msg.chat.id !== allowedChatId) return; // Faqat kerakli guruhda ishlashi uchun tekshiruv

  try {
    const {
      chat,
      message_id: messageId,
      left_chat_member: leftMember,
    } = msg;
    bot.deleteMessage(chat.id, messageId);

    // Adminlarga xabar yuborish
    const userProfileLink = `tg://user?id=${
      leftMember.username || leftMember.id
    }`;
    const adminMessage = `⚠️  <a href="${userProfileLink}">${leftMember.first_name}</a> guruhdan chiqib ketdi!`;
    notifyAdmins(adminMessage);

    // Foydalanuvchini bazadan o'chirish
    await User.deleteOne({ userId: leftMember.id });
  } catch (error) {
    console.error("Chiqib ketgan a'zoni qayta ishlashda xatolik:", error);
  }
});

bot.on('message', async (msg) => {
  if (msg.text === '/ratings') {
    try {
      // Ratingni olish
      const rating = await getRatings();

      // Ratingni formatlash
      const message = `📊 **Rating**:\n${rating
        .map((user, index) => {
          const userProfileLink = `tg://user?id=${user.userId}`;
          return `<b>${index + 1}.</b> <a href="${userProfileLink}">${
            user.firstName
          }</a>: ${user.addedUsers?.length || 0}ta foydalanuvchi`;
        })
        .join('\n')}`;

      // Adminlarga xabar yuborish
      admins.forEach(async (adminId) => {
        await bot.sendMessage(adminId, message, { parse_mode: 'HTML' });
      });
    } catch (error) {
      console.error('Ratingni olishda xatolik:', error);
      bot.sendMessage(msg.chat.id, '❌ Ratingni olishda xatolik yuz berdi.');
    }
  }
});
