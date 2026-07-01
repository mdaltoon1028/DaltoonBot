import telebot
from telebot.types import InlineKeyboardButton, CopyTextButton
print(InlineKeyboardButton(text="hello", copy_text=CopyTextButton(text="test link")).to_dict())
