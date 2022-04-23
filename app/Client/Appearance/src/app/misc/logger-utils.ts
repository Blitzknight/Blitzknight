import { LogLevel } from 'typescript-logging';
import { Log4TSProvider, Logger } from 'typescript-logging-log4ts-style';

export class LoggerUtils {
  static readonly provider = Log4TSProvider.createProvider('OmoikaneProvider', {
    groups: [
      {
        expression: new RegExp('model.+'),
        level: LogLevel.Debug,
      },
      {
        expression: new RegExp('.+'),
        level: LogLevel.Debug,
      },
    ],
  });

  public static getLogger(moduleName: string): Logger {
    return LoggerUtils.provider.getLogger(moduleName);
  }
}
