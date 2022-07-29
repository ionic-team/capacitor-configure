# @trapezedev/project

## 5.0.0

### Major Changes

- 10637dc: Changed merge algorithm for XML operations. This is a breaking change.

  ## New XML Merge Algorithm (breaking)

  The merge operation was changed to support deep trees and fix some issues with the past algorithm. To do this, a breaking change was required in that a matching root tag should be supplied to merge the two trees. In the old format this was not required.

  ## Old format:

  ```yaml
  xml:
    - file: file.xml
      target: entries/field
      merge: |
        <string>Value</string>
  ```

  ## New format:

  ```yaml
  xml:
    - file: file.xml
      target: entries/field
      merge: |
        <field>
          <string>Value</string>
        </field>
  ```

### Patch Changes

- Updates to XML operations and support for multiple operations on single files
- 10637dc: Fix build
- Updated dependencies [10637dc]
- Updated dependencies
- Updated dependencies [10637dc]
  - @trapezedev/gradle-parse@5.0.0

## 5.0.0-next.1

### Patch Changes

- Fix build
- Updated dependencies
  - @trapezedev/gradle-parse@5.0.0-next.1

## 5.0.0-next.0

### Major Changes

- Changed merge algorithm for XML operations. This is a breaking change.

  ## New XML Merge Algorithm (breaking)

  The merge operation was changed to support deep trees and fix some issues with the past algorithm. To do this, a breaking change was required in that a matching root tag should be supplied to merge the two trees. In the old format this was not required.

  ## Old format:

  ```yaml
  xml:
    - file: file.xml
      target: entries/field
      merge: |
        <string>Value</string>
  ```

  ## New format:

  ```yaml
  xml:
    - file: file.xml
      target: entries/field
      merge: |
        <field>
          <string>Value</string>
        </field>
  ```

### Patch Changes

- Updated dependencies
  - @trapezedev/gradle-parse@5.0.0-next.0

## 4.0.1

### Patch Changes

- Gradle exact targeting
- Updated dependencies
  - @trapezedev/gradle-parse@4.0.1

## 4.0.0

### Patch Changes

- e920098: Fix for incrementBuild with pbx files when defaults aren't set
- 7a91d46: Fixing deps
- 6028709: 4.0.0
- Updated dependencies [e920098]
- Updated dependencies [7a91d46]
- Updated dependencies [6028709]
  - @trapezedev/gradle-parse@4.0.0

## 4.0.0-next.2

### Patch Changes

- Fix for incrementBuild with pbx files when defaults aren't set

- Updated dependencies []:
  - @trapezedev/gradle-parse@4.0.0-next.2

## 4.0.0-next.1

### Patch Changes

- Fixing deps

- Updated dependencies []:
  - @trapezedev/gradle-parse@4.0.0-next.1

## 4.0.0

### Patch Changes

- Fixing release

- Updated dependencies []:
  - @trapezedev/gradle-parse@4.0.0

## 4.0.0-next.0

### Major Changes

- This update adds support for arbitrary plist files. Use the `file` field to reference a plist file relative to the native iOS project path.

  This update also had some internal refactoring which has impacted some public types to make them stronger and more concrete, and removes a few legacy operation aliases.

  ## Breaking Changes

  **`@trapezedev/configure`**

  The `infoPlist` operation for `ios` was removed. This was just an alias for `plist` Use the `plist` operation

  **`@trapezedev/project`**

  `JsonFile.getData()` was renamed to `getDocument()` to be more consistent with the other file wrappers.

  VFS types have been made more concrete and data stored in the VFS must now be either a `string` or extend `VFSStorable`.

### Patch Changes

- Updated dependencies []:
  - @trapezedev/gradle-parse@4.0.0

## 3.0.7

### Patch Changes

- Added options for entitlements to support merging or replacing

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.7

## 3.0.6

### Patch Changes

- Added new XML operations to iOS and updated docs"

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.6

## 3.0.5

### Patch Changes

- Improved error logging

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.5

## 3.0.4

### Patch Changes

- Release ios and android directory options

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.4

## 3.0.3

### Patch Changes

- Added support for deleting nodes and attributes per #73

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.3

## 3.0.2

### Patch Changes

- Added support for generating Info.plist if not exists

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.2

## 3.0.1

### Patch Changes

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.1

## 3.0.0

### Major Changes

- Releasing first version of Trapeze

### Patch Changes

- Updated dependencies []:
  - @trapezedev/gradle-parse@3.0.0

## 2.0.10

### Patch Changes

- Added support for Android properties files

- Updated dependencies []:
  - @capacitor/gradle-parse@2.0.10

## 2.0.9

### Patch Changes

- JSON support and Windows

- Updated dependencies []:
  - @capacitor/gradle-parse@2.0.9

## 2.0.8

### Patch Changes

- Release with latest updates

- Updated dependencies []:
  - @capacitor/gradle-parse@2.0.8

## 2.0.7

### Patch Changes

- Bad release
- Updated dependencies
  - @capacitor/gradle-parse@2.0.7

### Major Changes

- Bump to 2.0.6

### Patch Changes

- Updated dependencies
  - @capacitor/gradle-parse@3.0.0

## 2.0.6

### Patch Changes

- Add support for overriding gradle variables
- Updated dependencies
  - @capacitor/gradle-parse@2.0.6

## 2.0.5

### Patch Changes

- Add merge option for manifest nodes
  - @capacitor/gradle-parse@2.0.5

## 2.0.4

### Patch Changes

- Merge manifest nodes. Fixes #55
  - @capacitor/gradle-parse@2.0.4

## 2.0.3

### Patch Changes

- Fixing package fixing
- Updated dependencies
  - @capacitor/gradle-parse@2.0.3

## 2.0.2

### Patch Changes

- Built

## 2.0.1

### Patch Changes

- Added support for replace for gradle files

## 2.0.0

### Major Changes

- Fixed issue with iOS getBuild and made several iOS project functions async

## 1.1.1

### Patch Changes

- Fix loading of capacitor config
- Updated dependencies
  - @capacitor/gradle-parse@1.0.23

## 1.1.0

### Minor Changes

- Support customizing the project root and loading capacitor config

## 1.0.31

### Patch Changes

- remove bad rollup packages

## 1.0.30

### Patch Changes

- Changset
- Updated dependencies
  - @capacitor/gradle-parse@1.0.22

## 1.0.29

### Patch Changes

- Moved to smaller prettier build
- Updated dependencies
  - @capacitor/gradle-parse@1.0.21
