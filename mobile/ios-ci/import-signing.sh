#!/usr/bin/env bash
# Import Apple signing assets into a temporary CI keychain.
set -euo pipefail

KEYCHAIN_PASSWORD="${KEYCHAIN_PASSWORD:-ci-temp-keychain}"
KEYCHAIN_PATH="${RUNNER_TEMP:-/tmp}/app-signing.keychain-db"
CERT_PATH="${RUNNER_TEMP:-/tmp}/certificate.p12"
PROFILE_PATH="${RUNNER_TEMP:-/tmp}/profile.mobileprovision"
PROFILE_PLIST="${RUNNER_TEMP:-/tmp}/profile.plist"

: "${APPLE_CERTIFICATE_BASE64:?missing APPLE_CERTIFICATE_BASE64}"
: "${APPLE_CERTIFICATE_PASSWORD:?missing APPLE_CERTIFICATE_PASSWORD}"
: "${APPLE_PROVISIONING_PROFILE_BASE64:?missing APPLE_PROVISIONING_PROFILE_BASE64}"

echo "$APPLE_CERTIFICATE_BASE64" | base64 --decode > "$CERT_PATH"
echo "$APPLE_PROVISIONING_PROFILE_BASE64" | base64 --decode > "$PROFILE_PATH"

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security import "$CERT_PATH" \
  -P "$APPLE_CERTIFICATE_PASSWORD" \
  -A \
  -t cert \
  -f pkcs12 \
  -k "$KEYCHAIN_PATH"
security list-keychain -d user -s "$KEYCHAIN_PATH"
security set-key-partition-list -S apple-tool:,apple: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

security cms -D -i "$PROFILE_PATH" > "$PROFILE_PLIST"
PROFILE_UUID="$(/usr/libexec/PlistBuddy -c 'Print UUID' "$PROFILE_PLIST")"
PROFILE_NAME="$(/usr/libexec/PlistBuddy -c 'Print Name' "$PROFILE_PLIST")"
mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
cp "$PROFILE_PATH" "$HOME/Library/MobileDevice/Provisioning Profiles/${PROFILE_UUID}.mobileprovision"

echo "Imported provisioning profile name=${PROFILE_NAME} uuid=${PROFILE_UUID}"
if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "PROFILE_UUID=${PROFILE_UUID}"
    echo "PROVISIONING_PROFILE_NAME=${PROFILE_NAME}"
  } >> "$GITHUB_ENV"
fi
