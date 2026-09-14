# SIGNALIS: Replika & Icon Sheets

One Foundry VTT module, with two separately selectable character sheets. Each has Diagnostics, Skills, Loadout, and Memory pages using the supplied campaign artwork.

## Requirements and validation status

- Foundry VTT **14**.
- Call of Cthulhu 7th Edition system **CoC7 8.15 or later within Foundry 14**.
- A `character` actor. This module does not register NPC or creature sheets.
- Preview release 0.1.0. No `verified` compatibility value is asserted because a licensed live Foundry runtime was not available for testing. The implementation was checked against Foundry 14 ActorSheetV2 documentation and the CoC7 8.15 source at commit `7974aaca08dd15e78959e71f8ce2e0a0ee008a01`. Newer system releases may change APIs.

Source references:
- https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html
- https://foundryvtt.com/article/module-development/
- https://github.com/Miskatonic-Investigative-Society/CoC7-FoundryVTT/tree/7974aaca08dd15e78959e71f8ce2e0a0ee008a01

## Install locally

1. Stop Foundry.
2. Make `Data/modules/signalis-coc7-sheets/` in your Foundry user-data directory.
3. Extract the INSTALL archive contents there. `module.json` must be directly inside that folder, alongside `scripts`, `styles`, `templates`, and `assets`.
4. Start Foundry and open your CoC7 world. Enable **SIGNALIS: Replika & Icon Sheets** in Manage Modules.
5. Open an investigator. Use its sheet configuration control and select **SIGNALIS - Replika** or **SIGNALIS - Imperial Icon** (the actual labels use a long dash). Apply the selection to that actor. Existing default sheets are not changed automatically.

## Publish on GitHub

Use the SOURCE archive for a repository. The `module.json`, `package.json`, `scripts`, `styles`, `templates`, `assets`, and `.github` directory must be at the repository root. Preserve the `.github/workflows/release.yml` file, which file pickers sometimes hide.

1. Create a public GitHub repository. Upload the extracted SOURCE contents or commit them with Git.
2. Commit the workflow and all artwork as well as the manifest. `module.json` alone cannot install this module.
3. Push the tag `v0.1.1`. For example, in your repository checkout:

```bash
git tag v0.1.1
git push origin v0.1.1
```

4. The GitHub Actions workflow checks the code and tests, constructs the URLs using your real repository name, and creates a release with **module.json** and **signalis-coc7-sheets.zip**.
5. In Foundry Setup > Add-on Modules > Install Module, use:

```text
https://github.com/YOUR-USERNAME/YOUR-REPOSITORY/releases/latest/download/module.json
```

Replace the username and repository in that installation URL. You do not have to edit URL placeholders inside the source manifest: the release script writes the actual URLs. The repository-root manifest intentionally has no download URL until it is packaged for your repository. Use the release-asset manifest for Foundry installation.

For later updates, push a new tag such as `v0.1.1`. The tag sets the packaged version. If you prefer to publish manually, run `npm run release -- YOUR-USERNAME/YOUR-REPOSITORY v0.1.1` with Node 22 and Python 3 installed, then attach both files from `dist/` to that exact tagged GitHub release.

## Using the sheets

- All four bottom page buttons work. The top toolbar provides the same navigation without scrolling to the bottom.
- Click a field, edit it, and leave the field to save. Text areas accept multiple lines.
- Edit Regular characteristics and skill totals. Hard and Extreme values calculate automatically and are read-only.
- Right-click a characteristic or skill value to open a CoC7 roll. Right-clicking Hard/Extreme requests that difficulty. Shift-right-click fast-forwards where the native API supports it.
- Right-click Luck or current Sanity for a native attribute check. Sanity loss encounters, combat reactions, chases, improvement, and advanced tools remain in the native CoC7 sheet.
- Major wound, unconsciousness, dying, and insanity checkboxes call native CoC7 condition methods.
- Click the portrait box to choose an actor portrait through Foundry's file picker, subject to your upload permissions.
- **Native CoC7 sheet** opens the standard sheet for this same actor. It does not create a second actor or change your chosen sheet.

### Skills

The printed SIGNALIS aliases map to their standard CoC7 names (for example, Cosmic Mythos / Cthulhu Mythos, Data Systems / Computer Use, Forbidden Culture / Occult, and Status & Resources / Credit Rating).

A unique exact English name or alias matches automatically. Duplicate names, localized skills, and specialty slots need explicit selection in **Skills & items > Skill links**. The sheet never guesses between multiple candidates. Create missing basic skills with the corresponding button. For Art/Craft, Science, Language, Fighting, and other specialty slots, create the actual skill in the native sheet and then select it in the linking panel.

The Regular value is the full native skill total. Changing it adjusts `system.adjustments.experience` by the difference and preserves occupation/personal allocations. An Active Effect controlling the skill must be edited through the native sheet. Development checks use CoC7's `system.flags.developement`; Mythos and Credit Rating do not gain development checks.

The three free additional-skill rows on the supplied Replika artwork remain campaign reference fields. Use native Items and the inventory panel to roll additional skills. The supplied Icon artwork does not contain those three free rows.

### Weapons and other items

In **Skills & items > Weapon row links**, explicitly select a native weapon Item for each row 2-6. Row 1 remains the printed unarmed attack and reads Fighting (Brawl). Linked weapon fields edit the actual Item's name, damage, normal range, uses per round, ammunition, and malfunction value. Percentages read its main linked skill. Right-click a weapon name or percentage for the native combat dialog; choose attack difficulty and modifiers there. Printed weapon damage is the base formula; native weapon properties govern added damage bonus.

Use the native sheet to create Items, configure alternate skills/range bands, and manage full inventory and spell automation. The **Native inventory, spells, and skills** list opens all owned Item sheets and offers skill/weapon rolls. The printed carried/stored gear and bioresonance boxes are campaign notes, not a second automated inventory or spell system.

### Data persistence and limits

Core data writes to `system.characteristics`, `system.attribs`, `system.infos`, native conditions, and embedded skill/weapon Items. Model/serial, allegiance, backstory panels, symptoms, finances, signal notes, extra free rows, starting/day-start Sanity, and movement adjustment reminders persist under `flags.signalis-coc7-sheets.notes`. They survive sheet changes and module deactivation. They do not replace native biography, currency, or spell fields.

Editing HP/MP/Sanity maximum, movement, damage bonus, or build disables that specific native automatic calculation. Re-enable it in the native sheet if desired. The two printed movement +/-1 checkboxes are reminders, not additional movement modifiers.

No automatic import of data entered in the PDF is included. This module uses the images and maps fields to Foundry actor data.

## Checks before campaign use

Use a test world or duplicate investigator first:

1. Install and enable in Foundry 14 with CoC7 8.15. Confirm no startup errors.
2. Select each sheet, open all four pages, resize the window, and test both top and bottom navigation.
3. Set STR, HP, Luck, and a multiline memory note. Close and reopen; confirm values persist. Confirm STR/HP/Luck also appear in the native sheet.
4. Link an existing skill, change its Regular total, and confirm the native Item and Hard/Extreme values agree. Test a native roll and a development mark.
5. Link a weapon, edit ammunition, and run its native attack dialog.
6. Toggle a condition and check the native sheet/status effect. Test portrait selection.
7. Log in as a player with Observer permission: no actor/Item writes or rolls should be possible. Change to Owner and verify editing works.
8. Test a token with an unlinked actor, then confirm its changes stay on that token's actor.

Development commands: `npm run check` and `npm test`. No third-party npm dependencies or production build are required. `scripts/layouts.js` contains the field and navigation coordinates, as percentages, for the eight images.

## Artwork update 0.1.1

Includes the eight revised Replika and Icon menu pages, with remapped fields and navigation hotspots. All 773 field identifiers and the module ID are unchanged. Replace the complete module package, not only module.json. Reload Foundry after installation.

Upload the extracted SOURCE ZIP contents to your GitHub repository, including the release workflow. Push tag `v0.1.1` to build the install ZIP and the manifest with your actual repository URLs. The source module.json intentionally has no invented download URL.

Validation: JavaScript syntax, automated module tests, and visual field-overlay review. This release has not been tested in a running Foundry world.
