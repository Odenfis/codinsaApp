import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: {
      usuario: string;
    };
  }
}
