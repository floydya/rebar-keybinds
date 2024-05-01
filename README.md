# Rebar Keybinds API

This Rebar Keybinds plugin provides comprehensive keybinding management, allowing developers to easily implement and manage custom keybinds. It supports conditional keybinds based on the player's state, rebinding keys at runtime, and persisting custom key settings.

## Credits

This project is a refactored version of the original idea by [Styuk](https://github.com/Stuyk).

It has been adapted to fit the new framework, enhancing functionality and user experience.

Source Code: [Original Repository](https://github.com/Stuyk/altv-athena/blob/master/src/core/client/systems/hotkeyRegistry.ts)


## Features

- **Dynamic Keybinding**: Easily bind keys to actions and manage them dynamically during gameplay.
- **Conditional Keybinds**: Set conditions for keybinds to work based on player status such as aiming, being on foot, or driving.
- **Persistence**: Player custom key settings are saved locally and loaded automatically on server join.
- **Modifier Support**: Support for key modifiers like shift, ctrl, and alt.
- **Spam Prevention**: Manage key spamming with customizable cooldowns.
- **Shared interfaces**: You don't need to import interfaces, they are shared through a global namespace.

## Installation

1. Clone this repository or download the latest release.
2. Place the plugin folder into `src/plugins/`.
3. Done.

## Usage

```ts

import { useClientApi } from '@Client/api/index.js';

const keyBind: KeyInfo = {
    key: 66, // B
    description: 'Trigger some awesome feature',
    identifier: 'trigger-some-awesome-feature',
    keyDown: () => {
        console.log('Key pressed');
    },
    restrictions: {
        isVehicle: true,
    }
}

// Add keybind to the registry.
useClientApi().get('keybinds-api').add(keyBind);

// In this case, check if player is in vehicle
// Use `identifier` there, if you have more than one binding for key.
useClientApi().get('keybinds-api').checkValidation('trigger-some-awesome-feature');
// This will work too:
useClientApi().get('keybinds-api').checkValidation(66);

// You can also declare an API once:
const keyBinds = useClientApi().get('keybinds-api');

// Disable keybind:
keyBinds.get('keybinds-api').disable('trigger-some-awesome-feature');
// Alternative:
keyBinds.get('keybinds-api').disable(66);

// Enable keybind:
keyBinds.get('keybinds-api').enable('trigger-some-awesome-feature');
// Alternative:
keyBinds.get('keybinds-api').enable(66);

// Get KeyInfo by key/identifier:
let awesomeKeyBind: KeyInfo = keyBinds.hotkey('trigger-some-awesome-feature');
// Alternative:
let alternativeKeyBind: KeyInfo = keyBinds.hotkey(66);

// Get all bound keys:
const boundKeys: KeyInfo[] = keyBinds.hotkeys();

// Rebind a keybind for current player.
// This actions is persistent. It will save a replacement to LocalStorage, 
// so it will automatically be loaded on next server join.
const newKey = 84; // T
keyBinds.rebind('trigger-some-awesome-feature', newKey);
// Or alternatively:
keyBinds.rebind(66, newKey);
```
