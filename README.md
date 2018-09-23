# firefox-downloader

> Download and execute latest version of Firefox seamlessly. (experimental support for macOS)

## Install

```bash
npm install firefox-downloader
```

## Usage

```ts
import Fetcher from 'firefox-downloader'
// const Fetcher = require('firefox-downloader').default

const fetcher = new Fetcher(destination)

fetcher.download()
    .then(firefoxPath => spawn(firefoxPath))


```

## API

### `Fetcher`
```ts
const fetcher = new Fetcher(destination: string, platform?: NodeJS.Platform)
```


#### `download`
```ts
fetcher.download(progressCallback?: (progress: number, size: number) => void): Promise<string>
```
Download *Firefox* to the provided destination. Take an optional function to indicate progress.

#### `getPath`
```js
fetcher.getPath(): string
```
Give the path to *Firefox* executable.