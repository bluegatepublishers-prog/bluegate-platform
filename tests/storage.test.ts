import { describe, it, afterEach, beforeEach } from "node:test";
import assert from "node:assert";
import { getR2Config, _resetR2ConfigForTest } from "../lib/storage/config-core";
import { generateObjectKey, normalizeAndValidateObjectKey } from "../lib/storage/object-key";
import { createContentDisposition } from "../lib/storage/disposition";
import { isValidFileSize, MimeTypes } from "../lib/storage/file-policy";

describe("Storage Foundation", () => {
  describe("R2 Configuration (getR2Config)", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      _resetR2ConfigForTest();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    const setValidEnv = () => {
      process.env.R2_ACCOUNT_ID = "test-account-id-12345";
      process.env.R2_BUCKET_NAME = "test-bucket";
      process.env.R2_ACCESS_KEY_ID = "test-key-id";
      process.env.R2_SECRET_ACCESS_KEY = "test-secret";
      process.env.R2_ENDPOINT = "https://test-account-id-12345.r2.cloudflarestorage.com";
    };

    it("should throw if a required variable is missing", () => {
      setValidEnv();
      process.env.R2_BUCKET_NAME = "";
      assert.throws(() => getR2Config(), /Missing required R2 environment variable: R2_BUCKET_NAME/);
    });

    it("should throw if endpoint is not a valid URL", () => {
      setValidEnv();
      process.env.R2_ENDPOINT = "not-a-valid-url";
      assert.throws(() => getR2Config(), /Invalid R2_ENDPOINT/);
    });

    it("should throw if endpoint is not HTTPS", () => {
      setValidEnv();
      process.env.R2_ENDPOINT = "http://test-account-id-12345.r2.cloudflarestorage.com";
      assert.throws(() => getR2Config(), /Invalid R2_ENDPOINT/);
    });

    it("should throw if endpoint is not a Cloudflare R2 host", () => {
      setValidEnv();
      process.env.R2_ENDPOINT = "https://s3.amazonaws.com";
      assert.throws(() => getR2Config(), /Invalid R2_ENDPOINT/);
    });

    it("should throw if endpoint account ID does not match", () => {
      setValidEnv();
      process.env.R2_ENDPOINT = "https://another-account.r2.cloudflarestorage.com";
      assert.throws(() => getR2Config(), /Invalid R2_ENDPOINT/);
    });

    it("should return a valid config object", () => {
      setValidEnv();
      const config = getR2Config();
      assert.strictEqual(config.bucketName, "test-bucket");
      assert.strictEqual(config.endpoint, "https://test-account-id-12345.r2.cloudflarestorage.com");
    });
  });

  describe("Object Key Safety", () => {
    it("should reject empty keys", () => {
      assert.throws(() => normalizeAndValidateObjectKey(""), /Object key cannot be empty/);
    });

    it("should reject absolute paths", () => {
      assert.throws(() => normalizeAndValidateObjectKey("/path/to/file"), /Object key cannot be an absolute path/);
    });

    it("should reject Windows drive paths", () => {
      assert.throws(() => normalizeAndValidateObjectKey("C:\\Users\\file.txt"), /Object key cannot be an absolute path/);
    });

    it("should reject path traversal", () => {
      assert.throws(() => normalizeAndValidateObjectKey("path/../file"), /Object key cannot contain dot segments/);
    });

    it("should reject dot segments", () => {
      assert.throws(() => normalizeAndValidateObjectKey("./file"), /Object key cannot contain dot segments/);
    });

    it("should reject control characters", () => {
      assert.throws(() => normalizeAndValidateObjectKey("path/to\nfile"), /Object key cannot contain control characters/);
    });

    it("should reject URLs", () => {
      assert.throws(() => normalizeAndValidateObjectKey("https://example.com/key"), /Object key cannot be a URL/);
    });

    it("should reject query strings and fragments", () => {
      assert.throws(() => normalizeAndValidateObjectKey("path/file?query=1"), /Object key cannot contain query strings or fragments/);
      assert.throws(() => normalizeAndValidateObjectKey("path/file#fragment"), /Object key cannot contain query strings or fragments/);
    });

    it("should normalize slashes and return the key", () => {
      const key = normalizeAndValidateObjectKey("  path\\to//file.txt  ");
      assert.strictEqual(key, "path/to/file.txt");
    });

    it("should accept a valid key", () => {
      // Should not throw
      normalizeAndValidateObjectKey("prefix/tenant-id/uuid.png");
    });

    it("should generate a safe, unique key", () => {
      const key = generateObjectKey("book-covers", "pub-123", "My File Name.JPG");
      // UUID is randomly generated, so we check the format with a regex
      assert.ok(/^book-covers\/pub-123\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/My_File_Name\.jpg$/.test(key));
    });
  });

  describe("Content Disposition", () => {
    it("should create a safe ASCII-only disposition", () => {
      const result = createContentDisposition('file"name:with/bad\\chars.pdf');
      assert.strictEqual(result, 'attachment; filename="file_name_with_bad_chars.pdf"; filename*=UTF-8\'\'file%22name%3Awith%2Fbad%5Cchars.pdf');
    });

    it("should handle Unicode filenames correctly", () => {
      const result = createContentDisposition("résumé-à-télécharger.pdf");
      assert.strictEqual(result, 'attachment; filename="résumé-à-télécharger.pdf"; filename*=UTF-8\'\'r%C3%A9sum%C3%A9-%C3%A0-t%C3%A9l%C3%A9charger.pdf');
    });

    it("should provide a fallback for undefined filenames", () => {
      const result = createContentDisposition(undefined);
      assert.strictEqual(result, 'attachment; filename="download"');
    });
  });

  describe("File Policy", () => {
    it("should validate file sizes correctly", () => {
      assert.strictEqual(isValidFileSize(1, 100), true);
      assert.strictEqual(isValidFileSize(100, 100), true);
      assert.strictEqual(isValidFileSize(0, 100), false);
      assert.strictEqual(isValidFileSize(-1, 100), false);
      assert.strictEqual(isValidFileSize(101, 100), false);
    });

    it("should not contain executable MIME types", () => {
      const allMimeTypes = Object.values(MimeTypes);
      assert.strictEqual(allMimeTypes.some(m => m.startsWith("application/x-msdownload")), false);
      assert.strictEqual(allMimeTypes.some(m => m.startsWith("application/javascript")), false);
    });
  });
});