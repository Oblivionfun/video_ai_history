import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer('angle');
Config.setColorSpace('bt709');
Config.setDelayRenderTimeoutInMilliseconds(180000);
