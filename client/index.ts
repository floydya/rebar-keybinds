import * as alt from 'alt-client';
import * as native from 'natives';
import { useClientApi } from '@Client/api/index.js';
import { useWebview } from '@Client/webview/index.js';
import { PageNames } from '@Shared/webview/index.js';

export type KeyInfoDefault = KeyInfo & { default: number };

const keyMappings: KeyInfoDefault[] = [];
const keyDownTime: { [identifier: string]: number } = {};
const keyCooldown: { [identifier: string]: number } = {};
const webview = useWebview();

const keyModifier = {
    shift: {
        key: 16,
        pressed: false,
    },
    ctrl: {
        key: 17,
        pressed: false,
    },
    alt: {
        key: 18,
        pressed: false,
    },
};

class Keybinds {
    static init() {
        alt.on('keydown', Keybinds.keyDown);
        alt.on('keyup', Keybinds.keyUp);
        alt.everyTick(Keybinds.keyHeld);
    }

    /**
     * Checks provided restrictions against player state.
     * 
     * @param {KeyBindRestrictions} data Restrictions to check
     * @returns {boolean}
     */
    static isValidRestrictions(data: KeyBindRestrictions): boolean {
        if (typeof data === 'undefined') return true;
        if (data.isAiming && !alt.Player.local.isAiming) return false;
        if (data.isOnFoot && alt.Player.local.vehicle) return false;
        if (data.isVehicle || data.isVehicleDriver || data.vehicleModels || data.isVehiclePassenger) {
            if (!alt.Player.local.vehicle) return false;
            if (data.isVehicleDriver && alt.Player.local.seat !== 1) return false;
            if (data.isVehiclePassenger && alt.Player.local.seat === 1) return false;
            if (data.vehicleModels && !data.vehicleModels.find((veh) => veh === alt.Player.local.vehicle.model))
                return false;
        }
        if (data.isSwimming && !native.isPedSwimming(alt.Player.local.scriptID)) return false;
        if (data.weaponModels && !data.weaponModels.find((x) => alt.Player.local.currentWeapon)) return false;
        return true;
    }

    /**
     * Get an index of keybind.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @returns {number}
     */
    static getIndexByKeyOrIdentifier(keyOrIdentifier: number | string): number {
        const accessor: 'key' | 'identifier' = typeof keyOrIdentifier === 'string' ? 'identifier' : 'key';
        const index = keyMappings.findIndex((keyMapping) => keyMapping[accessor] === keyOrIdentifier);
        return index
    }

    /**
     * Disable/enable a keybind.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @param {boolean} value Keybind disabled state.
     * @returns {void}
     */
    static setDisabled(keyOrIdentifier: number | string, value: boolean): void {
        const index = Keybinds.getIndexByKeyOrIdentifier(keyOrIdentifier)
        if (index <= -1) return;
        keyMappings[index].disabled = value;
    }

    /**
     * Get key info.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @returns {KeyInfo | undefined} Returns undefined if no keybind found.
     */
    static getKeyInfo(keyOrIdentifier: number | string): KeyInfo | undefined {
        const accessor: 'key' | 'identifier' = typeof keyOrIdentifier === 'string' ? 'identifier' : 'key';
        return keyMappings.find((keyMapping) => keyMapping[accessor] === keyOrIdentifier);
    }

    /**
     * Get list of key info.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @returns {KeyInfo | undefined} Returns empty list if no keybinds found.
     */
    static getKeys(keyOrIdentifier: number | string): KeyInfo[] {
        const accessor: 'key' | 'identifier' = typeof keyOrIdentifier === 'string' ? 'identifier' : 'key';
        return keyMappings.filter((keyMapping) => keyMapping[accessor] === keyOrIdentifier);
    }

    /**
     * 'keydown' event handler.
     * 
     * @param {number} key Key number obtained from an alt event.
     * @returns {void}
     */
    static keyDown(key: number): void {
        const keys = Keybinds.getKeys(key);
        for (let keyInfo of keys) {
            if (!keyInfo) continue;
            if (keyInfo.disabled) continue;
            if (typeof keyInfo.spamPreventionInMs === 'number' && keyInfo.spamPreventionInMs > 1) {
                if (keyCooldown[keyInfo.identifier] && Date.now() < keyCooldown[keyInfo.identifier]) {
                    continue;
                }
                keyCooldown[keyInfo.identifier] = Date.now() + keyInfo.spamPreventionInMs;
            }
            let overrideMenuCheck = false;
            // Todo: remove additional condition for isSpecificPageOpen.
            if (keyInfo.allowInSpecificPage && typeof webview.isSpecificPageOpen === 'function') {
                overrideMenuCheck = webview.isSpecificPageOpen(keyInfo.allowInSpecificPage as PageNames);
            }

            if (keyInfo.allowIfDead) {
                overrideMenuCheck = true;
            }
            if (!keyInfo.allowInAnyMenu && webview.isAnyPageOpen() && !overrideMenuCheck) continue;
            if (keyInfo.modifier && keyModifier[keyInfo.modifier] && !keyModifier[keyInfo.modifier].pressed) continue;
            if (keyInfo.delayedKeyDown && keyInfo.delayedKeyDown.msToTrigger >= 1) {
                keyDownTime[keyInfo.identifier] = Date.now() + keyInfo.delayedKeyDown.msToTrigger;
            }
            if (!keyInfo.keyDown) continue;
            if(typeof keyInfo.restrictions !== "undefined" && !Keybinds.isValidRestrictions(keyInfo.restrictions)) continue;
            keyInfo.keyDown();
        }
    }

    /**
     * 'keyup' event handler.
     * 
     * @param {number} key Key number obtained from an alt event.
     * @returns {void}
     */
    static keyUp(key: number): void {
        const keys = Keybinds.getKeys(key);

        for (let keyInfo of keys) {
            if (!keyInfo) return;

            delete keyDownTime[keyInfo.identifier];

            if (keyInfo.disabled) return;
            let overrideMenuCheck = false;
            // Todo: remove additional condition for isSpecificPageOpen.
            if (keyInfo.allowInSpecificPage && typeof webview.isSpecificPageOpen === 'function') {
                overrideMenuCheck = webview.isSpecificPageOpen(keyInfo.allowInSpecificPage as PageNames);
            }

            if (!keyInfo.allowInAnyMenu && webview.isAnyPageOpen() && !overrideMenuCheck) return;
            if (keyInfo.modifier && keyModifier[keyInfo.modifier] && !keyModifier[keyInfo.modifier].pressed) return;
            if (!keyInfo.keyUp) return;
            keyInfo.keyUp();
        }
    }

    /**
     * Checks if key is held.
     */
    static keyHeld(): void {
        let isModifierDown = false;

        Object.keys(keyModifier).forEach((keyName) => {
            keyModifier[keyName].pressed = isModifierDown = alt.isKeyDown(keyModifier[keyName].key);
        });

        if (isModifierDown) native.disableControlAction(0, 86, true);

        Object.keys(keyDownTime).forEach((identifier) => {
            const timeToExceed = keyDownTime[identifier];
            if (Date.now() < timeToExceed) return;
            delete keyDownTime[identifier];
            const keyInfo = Keybinds.getKeyInfo(identifier);
            if (!keyInfo.delayedKeyDown) return;
            keyInfo.delayedKeyDown.callback();
        });

        for (let keyInfo of keyMappings) {
            if (!keyInfo.whilePressed) continue;
            if (keyInfo.disabled) continue;
            if (!alt.isKeyDown(keyInfo.key)) continue;
            keyInfo.whilePressed();
        }
    }
}

export function useKeybinds() {
    /**
     * Add a key bind to the start listening for key presses.
     * https://www.toptal.com/developers/keycode
     * 
     * @param {KeyInfo} keyBind Key details object.
     */
    function add(keyBind: KeyInfo) {
        alt.logDebug(`:::: Registered key=${keyBind.key} for action=${keyBind.identifier}`)
        const storageKey = `keybind-${keyBind.identifier}`;

        if (alt.LocalStorage.has(storageKey)) {
            const key = alt.LocalStorage.get(`keybind-${keyBind.identifier}`);
            keyMappings.push({ ...keyBind, default: keyBind.key, key });
        } else {
            keyMappings.push({ ...keyBind, default: keyBind.key });
        }
    }

    /**
     * Used to check if a keybind passes certain validation metrics.
     * Useful for show on-screen data related to a key bind.
     * Do not call this function constantly, use a delay. At least ~500 - 1000ms.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @returns {boolean}
     */
    function checkValidation(key: number): boolean
    function checkValidation(identifier: string): boolean
    function checkValidation(keyOrIdentifier: number | string): boolean {
        const keyInfo = Keybinds.getKeyInfo(keyOrIdentifier);
        if (typeof keyInfo === 'undefined') return false;
        return Keybinds.isValidRestrictions(keyInfo.restrictions);
    }

    /**
     * Disable a keybind.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     */
    function disable(key: number): void
    function disable(identifier: string): void
    function disable(keyOrIdentifier: number | string): void {
        Keybinds.setDisabled(keyOrIdentifier, true);
    }

    /**
     * Enable a keybind.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     */
    function enable(key: number): void
    function enable(identifier: string): void
    function enable(keyOrIdentifier: number | string): void {
        Keybinds.setDisabled(keyOrIdentifier, false);
    }

    /**
     * Rebind a keybind with a new key at runtime.
     * It will save a replacement to LocalStorage, so it will automatically be loaded on next server join.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     */
    function rebind(key: number, keyCode: number): void
    function rebind(identifier: string, keyCode: number): void
    function rebind(keyOrIdentifier: number | string, keyCode: number): void {
        const index = Keybinds.getIndexByKeyOrIdentifier(keyOrIdentifier);
        if (index <= -1) return;
        if (keyMappings[index].doNotAllowRebind) return;
        alt.LocalStorage.set(`keybind-${keyMappings[index].identifier}`, keyCode);
        alt.LocalStorage.save();

        keyMappings[index].key = keyCode;
    }

    /**
     * Returns all hotkeys and their relevant information.
     * 
     * @returns {KeyInfoDefault[]}
     */
    function hotkeys(): KeyInfoDefault[] {
        return keyMappings;
    }

    /**
     * Returns a keybind information for the key.
     * 
     * @param {number | string} keyOrIdentifier Key or keybind identifier.
     * @returns {KeyInfo | undefined} Returns undefined when key is not found or bound.
     */
    function hotkey(key: number): KeyInfo | undefined
    function hotkey(identifier: string): KeyInfo | undefined
    function hotkey(keyOrIdentifier: string | number): KeyInfo | undefined {
        return Keybinds.getKeyInfo(keyOrIdentifier);
    }

    return {
        add, checkValidation, disable, enable, rebind, hotkeys, hotkey,
    }
}

declare global {
    export interface ClientPlugin {
        ['keybinds-api']: ReturnType<typeof useKeybinds>;
    }
}

useClientApi().register('keybinds-api', useKeybinds());
Keybinds.init();
