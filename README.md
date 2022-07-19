# docs-bot
A service that handles navigation of a docgen project manifest.

## Commands

> **All arguments are required.**

```sh
$ npx slash-up list

/docs - Search documentation entries.
    class - Get entry for a class.
        class* string - The class to retrieve.
        share? boolean - Share the outcome of your query to the channel.
    event - Get entry for an event.
        class* string - The class to retrieve.
        event* string - The event to retrieve.
        share? boolean - Share the outcome of your query to the channel.
    method - Get entry for a method.
        class* string - The class to retrieve.
        method* string - The method to retrieve.
        share? boolean - Share the outcome of your query to the channel.
    prop - Get entry for a class prop.
        class* string - The class to retrieve.
        prop* string - The prop to retrieve.
        share? boolean - Share the outcome of your query to the channel.
    typedef - Get entry for a type definition.
        typedef* string - The typedef to retrieve.
        share? boolean - Share the outcome of your query to the channel.

/search - Search for a documentation entry.
    query* string - The query to search all entries.

/code - Get a section of code from the source repository.
    entity - Fetch a file from a type entity.
        query* string - The query to search all entries.
        around? integer - How many lines to retrieve around the entity. (default = 3)
        share? boolean - Share your result with others in the channel. (default = false)
    lines - Fetch specific lines from the source code.
        query* string - The query to search all entries.
        start integer - Where to select from.
        end integer - Where to select to.
        share? boolean - Share your result with others in the channel. (default = false)
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
