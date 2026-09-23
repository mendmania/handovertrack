  if ([[NSBundle mainBundle] objectForInfoDictionaryKey:@"Task05ValidationBuild"]) {
    NSString *root = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    NSData *raw = [NSData dataWithContentsOfFile:[root stringByAppendingPathComponent:@"task05-control.json"]];
    NSDictionary *c = raw ? [NSJSONSerialization JSONObjectWithData:raw options:0 error:nil] : nil;
    NSString *caseID = c[@"caseId"];
    if ([caseID isKindOfClass:NSString.class] && [[NSUUID alloc] initWithUUIDString:caseID]) {
      NSString *eventPath = [root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-native.json",caseID]];
      NSData *eventBytes = [NSData dataWithContentsOfFile:eventPath];
      NSDictionary *event = eventBytes ? [NSJSONSerialization JSONObjectWithData:eventBytes options:0 error:nil] : nil;
      NSString *expected = [NSString stringWithFormat:@"/uploads/%@/content",event[@"uploadId"]];
      if (event && [task.originalRequest.URL.path hasSuffix:expected]) {
        NSDictionary *result = @{@"atUnix":@([[NSDate date] timeIntervalSince1970]),
          @"finalTaskBytesSent":@(task.countOfBytesSent), @"expectedBytes":@(task.countOfBytesExpectedToSend),
          @"errorCode":@(error ? error.code : 0), @"taskState":@(task.state)};
        NSString *path = [root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-native-finished.json",caseID]];
        [[NSJSONSerialization dataWithJSONObject:result options:0 error:nil] writeToFile:path options:NSDataWritingWithoutOverwriting error:nil];
      }
    }
  }
