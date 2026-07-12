# Local iOS dogfood build

This runbook creates a bundled-JavaScript iOS Release build for local household dogfood. It does
not use EAS, TestFlight, OTA updates, production services, or a release channel.

## Guardrails

1. Run `df -h /` and require at least 10 GiB available before starting. Do not remove DerivedData,
   simulators, DeviceSupport, or user files without exact approval.
2. For simulator smoke, select only `Grith iPhone SE 3 iOS 26.3`
   (`5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6`).
3. Do not edit generated `ios/` files. Run a clean prebuild only after an intentional native-config
   change and review; otherwise use the existing incremental native project.

## Simulator Release build

```sh
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
npx expo run:ios --configuration Release \
  --device 5C46B6CC-9CC2-4326-84A3-2603E0F0F3C6 \
  --no-bundler
```

After install, stop Metro if it is running, terminate PuppyPlan, and launch it again with
`xcrun simctl launch`. A normal Diary → Quick Log → restart flow must continue without a Metro
connection because the Release app contains its JS bundle.

## Two physical iPhones

Open the existing Xcode workspace, select the PuppyPlan scheme, choose `Release`, and select the
owner's signing team. Install the same locally built revision on each explicitly selected iPhone.
Never auto-select or erase a device. If CocoaPods is invoked, keep `LANG` and `LC_ALL` set to
`en_US.UTF-8`. Developer Mode and device trust may require the owner to confirm on-device prompts.

Update by rebuilding the same revision and installing over the existing app, which preserves its
application container. Before an update, wait for pending Quick Log facts to sync. Roll back by
checking out the last known working local revision, rebuilding Release, and reinstalling; schema or
server rollback is not implied.

## Owner-executed acceptance checklist

- [ ] Install and ordinary-launch Release on phone A with Metro stopped.
- [ ] Install the same build on phone B; sign both into the same development account.
- [ ] Create a routine on phone A; foreground phone B and confirm it appears.
- [ ] Add a detailed backdated fact with a private note on phone A; foreground phone B and confirm
  the fact/time (do not copy the private text into evidence).
- [ ] Check off one planned item and confirm planned plus actual time on both phones.
- [ ] Explicitly turn notifications on and observe one physical banner.
- [ ] Disable notifications and confirm the routine remains visible but no new banner is scheduled.
- [ ] Sign out on one phone and confirm this app's pending notifications are cancelled while server
  facts remain visible on the still-signed-in phone.

These physical/signing/banner items are user acceptance and must not be self-certified by an agent.
