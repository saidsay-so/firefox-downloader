# firefox-downloader

> Download and execute latest version of Firefox seamlessly. (experimental support for macOS)

## Install

```bash
npm install firefox-downloader
```

## Usage

```ts
import Fetcher from 'firefox-downloader'

const fetcher = new Fetcher(destination)

fetcher.download()

spawn(fetcher.getPath())
```

## API

### `Fetcher`
```ts
const fetcher = new Fetcher(destination: string, platform?: NodeJS.Platform)
```


#### `download`
```js
fetcher.download(progressCallback?: (progress: number, size: number) => void)
```
Download *Firefox* to the provided destination. Take an optional function to indecate progress.

#### `getPath`
```js
fetcher.getPath()
```
Give the path to *Firefox* executable.