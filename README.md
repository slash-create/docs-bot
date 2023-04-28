# docs-bot
A service that handles navigation of a docgen project manifest.

## Functionality

> - `*` - Autocompletion available
> - `?` - Optional
> **All other arguments are required, unless otherwise specified.**

- For `/docs` specifically, if searching for an entry other than the `class` itself - and the option is available, the `class` **must** be searched for first (except `typedef`, they share runtime flow).

### Command List

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

/code - Get a section of code from the source repository.
    entity - Fetch a file from a type entity.
        query* string - The query to search all entries.
        around? integer - How many lines to retrieve around the entity. (default = 3)
        share? boolean - Share the outcome of your query to the channel.
        line_numbers? boolean - Include line numbers in code response. (default=false)
    lines - Fetch specific lines from the source code.
        query* string - The query to search all entries.
        start integer - Where to select from.
        end integer - Where to select to.
        share? boolean - Share the outcome of your query to the channel.
        line_numbers? boolean - Include line numbers in code response. (default=false)

/search - Search for a documentation entry.
    query* string - The query to search all entries.

/debug - Debug provided entities for interaction contexts.
    user - Print the payload for yourself or the target user.
        target? user - The user to target for debug. (default = @me)
    channel - Print the payload for the target channel.
        target channel - The channel to target for debug.
    role - Print the payload for the target role.
        target role - The role to target for debug.

Debug Message (MESSAGE)

Debug User (USER) -> /debug user target: {SELECTED}
```

### Showcase

- `/docs class class: SlashCreator`

  ![Docs_Class Command](assets/commands/docs-class.png)

- `/docs method class: MessageInteractionContext method: registerComponentFrom`

  ![Docs_Method Command](assets/commands/docs-method.png)

- `/code entity ...`

  ![Code_Entity Command](assets/commands/code-entity.png)

- `/debug channel target:{TYPE}`
  | **(Announcement) Thread (10)** | **(Channel) Thread (11)** | **(Forum) Thread (11)** |
  | ------------------------------ | ------------------------- | ----------------------- |
  | ![announcement_thread](./assets/commands/debug/channel/announce-thread.png) | ![channel_thread](./assets/commands/debug/channel/channel-thread.png) | ![forum_thread](./assets/commands/debug/channel/forum-thread.png) |

Full set of example responses are available from [the assets folder](./assets/commands/).

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
