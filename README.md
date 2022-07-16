# docs-bot
A service that handles navigation of a docgen project manifest.

## Commands

> **All arguments are required.**

```sh
$ npx slash-up list

/docs - Says hello to you.
    class - Get entry for a class.
        class* string - The class to retrieve.
    event - The event to retrieve.
        class* string - The class to retrieve.
        event* string - The event to retrieve.
    method - Get entry for a method.
        class* string - The class to retrieve.
        method* string - The method to retrieve.
    prop - Get entry for a class prop.
        class* string - The class to retrieve.
        prop* string - The prop to retrieve.
    typedef - The type to retrieve.
        typedef* string - The type to retrieve.

/search - Search for a documentation entry.
    query* string - The query to search all entries.
```

## Installation
```sh
git clone https://github.com/slash-create/docs-bot.git
cd docs-bot
# create the ".env" file and edit the variables (Configuration below)!
npx slash-up sync
yarn build
yarn start
```

### Configuration

> Derived from [the default configration](./app.json) without debug options.

| Key | Description |
| --- | ----------- |
| DISCORD_APP_ID | The application ID of the Discord app. |
| DISCORD_PUBLIC_KEY | The public key of the Discord app. |
| DISCORD_BOT_TOKEN | The bot token of the Discord app. |
| PORT | The port to listen on. |
