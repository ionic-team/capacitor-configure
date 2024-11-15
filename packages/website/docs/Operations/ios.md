---
title: iOS Operations
sidebar_position: 4
sidebar_label: iOS
---

To provide iOS project operations using the [Configuration Tool](./getting-started), use the `ios` platform key under the top-level `platforms` key:

```yaml
platforms:
  ios:
```

## Targets and Builds

iOS supports multiple operations and can perform them against different project targets and build types. If a target is not specified, the tool will infer the app target in the project. If a build is not specified commands will operate on all builds in a target (Debug and Release, for example). Thus, complex projects should specify at least the target name to avoid issues.

Here's an example of not supplying the target name and having it inferred by finding the first target with the productType of `"com.apple.product-type.application"`:

```yaml
platforms:
  ios:
    # Operations for the main app target
```

Here's an example of specifying the target:

```yaml
platforms:
  ios:
    targets:
      App:
        # Operations for the App target
      My App Clip:
        # Operations for the My App Clip target
```

In this example, both a target and build type are provided:

```yaml
platforms:
  ios:
    targets:
      App:
        builds:
          Debug:
            # Operations for the App target and Debug build
          Release:
            # Operations for the App target and Release build
```

### `version`

Updates the human-readable version for the given target and build:

```yaml
platforms:
  ios:
    targets:
      App:
        version: 16.4
```

### `buildNumber`

Sets the integer build number for the given target and build:

```yaml
platforms:
  ios:
    targets:
      App:
        buildNumber: 128
```

### `incrementBuild`

Increments the build number for the given target and build:

```yaml
platforms:
  ios:
    targets:
      App:
        incrementBuild: true
```

### `bundleId`

Sets the bundle id for the given target and build:

```yaml
platforms:
  ios:
    targets:
      App:
        bundleId: $BUNDLE_ID
```

### `displayName`

Sets the display name for the given target and build:

```yaml
platforms:
  ios:
    targets:
      App:
        displayName: My Awesome App
```

### `productName`

Sets the product name for the given target and build. This sets the `PRODUCT_NAME` field in your project build settings for this target and build.

```yaml
platforms:
  ios:
    targets:
      App:
        productName: Awesome App
```

### `buildSettings`

Sets build settings fields for this target and build.

```yaml
platforms:
  ios:
    targets:
      App:
        buildSettings:
          ENABLE_BITCODE: false
          STRIP_SWIFT_SYMBOLS: false
```

### `plist`

Updates values in the `INFOPLIST_FILE` for the given target and build, or updates the given plist `file`. Set `replace` to `true` to overwrite the entire target object (if `false`, the values will be merged):

**New in 7.0.3**:

Raw plist XML can be supplied using `xml` (which can be supplied directly or through an env var). When using this option along with `file`, the entire plist file is overwritten with the given source. When not using `file` the values are merged into the `INFOPLIST_FILE`.

```yaml
platforms:
  ios:
    targets:
      App:
        plist:
          - replace: true
            file: GoogleService-Info.plist
            entries:
              - Key: Value

          - replace: true
            entries:
              - UISupportedInterfaceOrientations:
                  - UIInterfaceOrientationPortrait

          - replace: false
            entries:
              - CFBundleURLTypes:
                  - CFBundleURLSchemes:
                      - AdditionalBundleURLScheme
          
          - file: GoogleService-Info.plist
            xml: $GOOGLE_SERVICE_PLIST_RAW
```

### `entitlements`

Updates the entitlements for a given target and build. The value can either be an array of objects to merge into the existing entitlements list, or specify the edit operation manually. See examples below:

```yaml
platforms:
  ios:
    targets:
      App:
        # Passing an array of objects, these values will be merged by default
        entitlements:
          - keychain-access-groups: ['$BUNDLE_ID', 'com.microsoft.intune.mam', 'com.microsoft.adalcache']
        # Passing an object with options for the entitlements operation, and then an array of objects
        entitlements:
          replace: true
          entries:
            - keychain-access-groups: ['$BUNDLE_ID', 'com.microsoft.intune.mam', 'com.microsoft.adalcache']
```

### `json`

Modifies JSON files relative to the root of the iOS project. Use `set` to override the element (and clobber any children), or `merge` to merge the values:

```yaml
platforms:
  ios:
    targets:
      App:
        json:
          - file: google-services.json
            set:
              project_info:
                project_id: "MY_ID"
          - file: google-services.json
            merge:
              data:
                field: "MY_FIELD"
```

### `xml`

Modifies XML files relative to the root of the iOS project. This operation supports the following XML file modifications:

- `attrs` updates the attributes of the given `target` node.
- `merge` merges the given XML tree supplied to `merge` with the given `target`. Merge expects a matching root node to be supplied. The merge algorithm merges any nodes that match with _at least all_ of the supplied node's attributes, or appends any new children not found in the target node.
- `inject` injects the given XML tree supplied to `inject` inside of the given `target`
- `delete` deletes nodes specified by `delete` in XPath format.
- `deleteAttributes` deletes the given attributes in `deleteAttributes` inside of the given `target`

```yaml
platforms:
  ios:
    targets:
      App:
        xml:
          - file: file.xml
            target: entries/field
            merge: |
              <field>
                <string>Value</string>
              </field>
```

### `copy`

Copies files, directories, or URLs relative to the root of the iOS project (`./ios/App` by default).

```yaml
platforms:
  ios:
    targets:
      App:
        copy:
          - src: ../firebase/GoogleService-Info.plist
            dest: App/GoogleService-Info.plist
          - src: old/path/of/directory
            dest: new/path/of/directory
          - src: https://example.com/file.png
            dest: new/path/of/file.png
```

### `strings`

*Since: 6.0.7*

Modify iOS `.strings` files to create and modify localization/translation strings.

Use `set` to set values directly by supplying an object, or `setFromJson` to supply a JSON file with mappings.

```yaml
platforms:
  ios:
    targets:
      App:
        strings:
          - file: App/Localizable.strings
            set:
              "Insert Element": "Insert Element"
          - file: App/Localizable.strings
            setFromJson: "lang/en.json"
```

### `xcconfig`

*Since: 6.0.7*

Modify iOS `.xcconfig` files to create and modify build configuration.

Use `set` to set values directly by supplying an object:

```yaml
platforms:
  ios:
    targets:
      App:
        xcconfig:
          - file: App/Config.xcconfig
            set:
              "PRODUCT_NAME": "$(NAME)"
```