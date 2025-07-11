# Workshop Addon Downloader для Garry's Mod

Этот инструмент автоматизирует загрузку аддонов из Steam Workshop для Garry's Mod с помощью SteamCMD.

## Настройка

Для работы необходимо задать следующие переменные окружения:

### Обязательные переменные
- `PORT` - Порт, на котором работает приложение (по умолчанию: 1030)
- `LOGIN` - Логин Steam аккаунта (должен иметь доступ к Workshop)
- `PASSWORD` - Пароль Steam аккаунта
- `TOKEN` - Секретный токен для запросов из Lua

### Пути
- `STEAM_PATH` - Основной путь к установке Steam
- `STEAM_CMD_PATH` - Полный путь к исполняемому файлу steamcmd.sh или steamcmd.exe
- `CACHE_PATH` - Путь для кэширования загруженных аддонов
- `FINAL_ADDONS_PATH` - Конечный путь для аддонов (обычно папка addons Garry's Mod)

## Пример .env файла

```env
PORT = 1030

LOGIN = ваш_steam_логин
PASSWORD = ваш_steam_пароль
TOKEN = ваш_секретный_токен_для_запроса_со_стороны_дополнения_гмода

STEAM_PATH = /home/academy/Steam
STEAM_CMD_PATH = /home/academy/asterion_workshop_downloader_v2/steamcmd/steamcmd.sh
CACHE_PATH = /home/academy/asterion_workshop_downloader_v2/cache
FINAL_ADDONS_PATH = /home/academy/steamcmd/garrysmod/garrysmod/addons
```
