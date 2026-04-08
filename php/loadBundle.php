<?php
declare(strict_types=1);

/*
 * Standalone bundle intake endpoint.
 *
 * Expected request:
 * {
 *   "version": 1,
 *   "packages": [
 *     { "resource": "members:sections:user:org", "repo": ["/repo"] }
 *   ]
 * }
 *
 * Query-string / request-parameter mode can use:
 *   version=1&type=repo&packages=a,b
 * or
 *   version=1&type=resource&packages=a,b
 *
 * Behavior for this first skeleton:
 * - Accept JSON or request parameters
 * - Parse and validate the bundle envelope
 * - Normalize package entries into resource objects
 * - Return the parsed packages array as JSON
 */
$repoList = [
    //__DIR__ . '/',
];
$defaultPackageLocation = 'package.json';

function send_json(int $status, array $payload): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE
            | JSON_PRETTY_PRINT
            | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function is_json_content_type(string $contentType): bool
{
    $contentType = strtolower(trim($contentType));

    if ($contentType === '') {
        return false;
    }

    return str_contains($contentType, 'application/json')
        || str_contains($contentType, '+json');
}

function is_utf8_text(string $value): bool
{
    if ($value === '') {
        return true;
    }

    return preg_match('//u', $value) === 1;
}

function fail_unsupported_text(string $context): never
{
    send_json(500, [
        'error' => 'Binary or invalid UTF-8 data is not supported',
        'context' => $context,
    ]);
}

function assert_utf8_text(string $value, string $context): void
{
    if (!is_utf8_text($value)) {
        fail_unsupported_text($context);
    }
}

function assert_utf8_json_value(mixed $value, string $context): void
{
    if (is_string($value)) {
        assert_utf8_text($value, $context);
        return;
    }

    if (!is_array($value)) {
        return;
    }

    foreach ($value as $key => $nested) {
        if (is_string($key)) {
            assert_utf8_text($key, $context . '.key');
        }

        $childContext = is_int($key)
            ? $context . '[' . $key . ']'
            : $context . '.' . $key;

        assert_utf8_json_value($nested, $childContext);
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        send_json(400, [
            'error' => 'Request body is empty',
        ]);
    }

    try {
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (\JsonException $e) {
        send_json(400, [
            'error' => 'Invalid JSON',
            'detail' => $e->getMessage(),
        ]);
    }

    if (!is_array($decoded) || array_is_list($decoded)) {
        send_json(400, [
            'error' => 'JSON body must be an object',
        ]);
    }

    return $decoded;
}

function split_csv_values(mixed $value): array
{
    $items = is_array($value) ? $value : explode(',', (string) $value);
    $out = [];

    foreach ($items as $item) {
        if (is_array($item)) {
            foreach (split_csv_values($item) as $nested) {
                $out[] = $nested;
            }
            continue;
        }

        $item = trim((string) $item);
        if ($item !== '') {
            $out[] = $item;
        }
    }

    return $out;
}

function normalize_packages(mixed $packages, string $field = 'resource'): array
{
    $queue = is_array($packages) ? $packages : [$packages];
    $out = [];

    foreach ($queue as $item) {
        if (is_string($item)) {
            foreach (split_csv_values($item) as $resource) {
                $out[] = [
                    $field => $resource,
                ];
            }
            continue;
        }

        if (is_array($item)) {
            if (array_is_list($item)) {
                foreach ($item as $nested) {
                    $nestedPackages = normalize_packages($nested, $field);
                    foreach ($nestedPackages as $nestedPackage) {
                        $out[] = $nestedPackage;
                    }
                }
                continue;
            }

            $resource = $item[$field] ?? $item['resource'] ?? $item['id'] ?? null;
            if (is_string($resource)) {
                $resource = trim($resource);
                if ($resource !== '') {
                    $out[] = [
                        $field => $resource,
                    ];
                }
            }
            continue;
        }

        $resource = trim((string) $item);
        if ($resource !== '') {
            $out[] = [
                $field => $resource,
            ];
        }
    }

    return $out;
}

function normalize_package_field(array $requestData): string
{
    if (array_key_exists('type', $requestData)) {
        $typeList = split_csv_values($requestData['type']);
        $type = strtolower(trim((string) ($typeList[0] ?? 'resource')));

        if ($type === 'resource' || $type === 'repo') {
            return $type;
        }

        if ($type !== '') {
            send_json(400, [
                'error' => 'Invalid type',
                'detail' => 'Use type=resource or type=repo.',
            ]);
        }
    }

    return 'resource';
}

function validateRepoList(array $repoList): void
{
    if ($repoList === []) {
        send_json(500, [
            'error' => 'Repositories improperly setup',
        ]);
    }

    foreach ($repoList as $repo) {
        if (!is_string($repo)) {
            send_json(500, [
                'error' => 'Repositories improperly setup',
            ]);
        }

        $repo = trim($repo);
        if ($repo === '') {
            send_json(500, [
                'error' => 'Repositories improperly setup',
            ]);
        }

        if (!is_dir($repo)) {
            send_json(500, [
                'error' => 'Repositories improperly setup',
            ]);
        }

        if (!is_readable($repo)) {
            send_json(500, [
                'error' => 'Repositories improperly setup',
            ]);
        }
    }
}

function foundResource(string $resource): bool
{
    // We do not have directory-backed resource lookup yet.
    return false;
}

function resolveRepoResource(string $resource, array $repoList, string $defaultPackageLocation): array|false
{
    $resource = trim($resource);
    if ($resource === '') {
        return false;
    }

    $resourcePath = trim(str_replace(':', '/', $resource), "/\\");
    $isJsonPackage = str_ends_with(strtolower($resourcePath), '.json');
    $resolvedPath = $isJsonPackage
        ? $resourcePath
        : rtrim($resourcePath, "/\\") . '/' . ltrim($defaultPackageLocation, "/\\");

    foreach ($repoList as $repo) {
        if (!is_string($repo)) {
            continue;
        }

        $repo = trim($repo);
        if ($repo === '') {
            continue;
        }

        $candidatePath = rtrim($repo, "/\\") . '/' . $resolvedPath;
        if (is_file($candidatePath) && is_readable($candidatePath)) {
            return [
                'repo' => $repo,
                'path' => $resolvedPath,
                'file' => $candidatePath,
                'kind' => $isJsonPackage ? 'json' : 'directory',
            ];
        }
    }

    return false;
}

function foundRepo(string $resource, array $repoList, string $defaultPackageLocation): string|false
{
    $location = resolveRepoResource($resource, $repoList, $defaultPackageLocation);
    return $location !== false ? $location['path'] : false;
}

function packageBaseFromResolvedPath(string $resolvedPath): string
{
    $resolvedPath = trim(str_replace('\\', '/', $resolvedPath), "/\\");
    $dir = dirname($resolvedPath);

    if ($dir === '.' || $dir === '') {
        return '/';
    }

    return '/' . trim($dir, "/\\") . '/';
}

function readJsonFilePayload(string $filePath, string $context = 'package manifest'): array
{
    if (!is_file($filePath) || !is_readable($filePath)) {
        fail_unsupported_text($context);
    }

    $raw = file_get_contents($filePath);
    if ($raw === false || trim($raw) === '') {
        fail_unsupported_text($context);
    }

    assert_utf8_text($raw, $context);

    try {
        $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
    } catch (\JsonException $e) {
        send_json(500, [
            'error' => 'Invalid JSON payload',
            'context' => $context,
        ]);
    }

    if (!is_array($decoded) || array_is_list($decoded)) {
        send_json(500, [
            'error' => 'Invalid JSON payload',
            'context' => $context,
        ]);
    }

    assert_utf8_json_value($decoded, $context);

    return [
        'raw' => $raw,
        'data' => $decoded,
    ];
}

function readJsonFile(string $filePath, string $context = 'package manifest'): array
{
    $payload = readJsonFilePayload($filePath, $context);
    return $payload['data'];
}

function readTextFile(string $filePath, string $context = 'text payload'): string
{
    if (!is_file($filePath) || !is_readable($filePath)) {
        fail_unsupported_text($context);
    }

    $raw = file_get_contents($filePath);
    if ($raw === false) {
        fail_unsupported_text($context);
    }

    assert_utf8_text($raw, $context);
    return $raw;
}

function resolveRelativeFilePath(string $baseDir, string $relativePath): string|false
{
    $baseDir = trim($baseDir);
    $relativePath = trim($relativePath);

    if ($baseDir === '' || $relativePath === '') {
        return false;
    }

    $baseReal = realpath($baseDir);
    if ($baseReal === false) {
        return false;
    }

    $relativePath = ltrim(str_replace('\\', '/', $relativePath), "/\\");
    $candidatePath = $baseReal . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);
    $candidateReal = realpath($candidatePath);
    if ($candidateReal === false) {
        return false;
    }

    $basePrefix = rtrim($baseReal, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    if ($candidateReal !== $baseReal && !str_starts_with($candidateReal, $basePrefix)) {
        return false;
    }

    return $candidateReal;
}

function normalizeBundleEntryList(mixed $entries, string $baseDir, string $contextPrefix): array
{
    if (!is_array($entries)) {
        return [];
    }

    $out = [];
    foreach ($entries as $entry) {
        if (is_string($entry)) {
            $url = trim($entry);
            if ($url === '') {
                continue;
            }

            $resolvedFile = resolveRelativeFilePath($baseDir, $url);
            if ($resolvedFile === false) {
                send_json(500, [
                    'error' => 'Missing bundle entry',
                    'context' => $contextPrefix,
                    'url' => $url,
                ]);
            }

            $out[] = [
                'id' => $url,
                'url' => $url,
                'data' => readTextFile($resolvedFile, $contextPrefix . ':' . $url),
            ];
            continue;
        }

        if (!is_array($entry)) {
            continue;
        }

        $id = $entry['id'] ?? $entry['name'] ?? $entry['resource'] ?? null;
        $url = $entry['url'] ?? $entry['path'] ?? $id;

        if (!is_string($id) || trim($id) === '') {
            continue;
        }

        if (!is_string($url) || trim($url) === '') {
            continue;
        }

        $url = trim($url);
        $resolvedFile = resolveRelativeFilePath($baseDir, $url);
        if ($resolvedFile === false) {
            send_json(500, [
                'error' => 'Missing bundle entry',
                'context' => $contextPrefix,
                'url' => $url,
            ]);
        }

        $out[] = [
            'id' => trim($id),
            'url' => $url,
            'data' => readTextFile($resolvedFile, $contextPrefix . ':' . $url),
        ];
    }

    return $out;
}

function buildBundlePackageItem(array $location): array
{
    $manifestPayload = readJsonFilePayload($location['file'] ?? '', 'package manifest');
    $manifest = $manifestPayload['data'];
    $packageFile = $location['file'] ?? '';
    $packageDir = is_string($packageFile) ? dirname($packageFile) : '';

    return [
        'meta' => [
            'base' => packageBaseFromResolvedPath($location['path'] ?? ''),
        ],
        'package' => [
            'url' => $location['path'] ?? '',
            'data' => $manifestPayload['raw'],
        ],
        'assets' => normalizeBundleEntryList($manifest['assets'] ?? [], $packageDir, 'asset'),
        'modules' => normalizeBundleEntryList($manifest['modules'] ?? [], $packageDir, 'module'),
    ];
}

function buildBundleEnvelope(array $packages): array
{
    $firstBase = $packages[0]['meta']['base'] ?? '/';

    return [
        'version' => 1,
        'compression' => 'none',
        'meta' => [
            'count' => count($packages),
            'base' => $firstBase,
            'url' => $_SERVER['SCRIPT_NAME'] ?? '/loadBundle.php',
        ],
        'packages' => $packages,
    ];
}

function validateRepositories(array $items, array $repoList, string $defaultPackageLocation): array
{
    $out = [];

    foreach ($items as $item) {
        $resource = null;

        if (is_array($item)) {
            $resource = $item['resource'] ?? $item['repo'] ?? $item['id'] ?? null;
        } elseif (is_string($item)) {
            $resource = $item;
        }

        if (!is_string($resource) || trim($resource) === '') {
            send_json(500, [
                'error' => 'invalid input',
                'repo' => $resource,
            ]);
        }

        if (foundResource($resource)) {
            $out[] = buildBundlePackageItem([
                'path' => $resource,
                'file' => $resource,
            ]);
            continue;
        }

        $resolved = resolveRepoResource($resource, $repoList, $defaultPackageLocation);
        if ($resolved !== false) {
            $out[] = buildBundlePackageItem($resolved);
            continue;
        }

        send_json(500, [
            'error' => 'not found',
            'repo' => $resource,
        ]);
    }

    return $out;
}

function parseRequest(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    $requestData = null;
    $isParamRequest = array_key_exists('version', $_REQUEST);

    // If version is present in request parameters, prefer the loose
    // request-parameter path so the endpoint is easy to test from a browser.
    if ($isParamRequest) {
        $requestData = $_REQUEST;
    } else {
        if (!is_json_content_type($contentType)) {
            send_json(415, [
                'error' => 'Content-Type must be application/json, or provide version in request parameters',
            ]);
        }
        $requestData = read_json_body();
    }

    if (!is_array($requestData)) {
        send_json(400, [
            'error' => 'Unable to parse request',
        ]);
    }

    if (!array_key_exists('version', $requestData)) {
        send_json(400, [
            'error' => 'Missing version',
        ]);
    }

    $version = (int) $requestData['version'];
    if ($version !== 1) {
        send_json(400, [
            'error' => 'Unsupported bundle version',
            'expected' => 1,
        ]);
    }

    if (!array_key_exists('packages', $requestData)) {
        send_json(400, [
            'error' => 'Missing packages',
        ]);
    }

    $field = normalize_package_field($requestData);
    $packages = normalize_packages($requestData['packages'], $field);

    if (!$packages) {
        send_json(400, [
            'error' => 'No packages supplied',
        ]);
    }

    return [
        'version' => $version,
        'packages' => $packages,
    ];
}

validateRepoList($repoList);
$request = parseRequest();
$packages = validateRepositories($request['packages'], $repoList, $defaultPackageLocation);

send_json(200, buildBundleEnvelope($packages));
