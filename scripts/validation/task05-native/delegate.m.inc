  // TASK05 OVERLAY: compiled only into the explicitly identified validation build.
  // Act inside the real NSURLSession upload delegate, before the JS event bridge.
  if ([[NSBundle mainBundle] objectForInfoDictionaryKey:@"Task05ValidationBuild"]) {
    NSString *root = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject;
    NSData *raw = [NSData dataWithContentsOfFile:[root stringByAppendingPathComponent:@"task05-control.json"]];
    NSDictionary *control = raw ? [NSJSONSerialization JSONObjectWithData:raw options:0 error:nil] : nil;
    NSString *caseID = control[@"caseId"];
    if ([caseID isKindOfClass:NSString.class] && [[NSUUID alloc] initWithUUIDString:caseID] && [control[@"action"] isEqual:@"arm"]) {
      NSString *bindingPath = [root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-binding.json",caseID]];
      NSData *bindingBytes = [NSData dataWithContentsOfFile:bindingPath];
      NSDictionary *binding = bindingBytes ? [NSJSONSerialization JSONObjectWithData:bindingBytes options:0 error:nil] : nil;
      NSString *expected = [NSString stringWithFormat:@"https://handovertrack.com/media/organizations/%@/uploads/%@/content",binding[@"organizationId"],binding[@"uploadId"]];
      NSString *kind = binding[@"kind"];
      NSString *eventPath = [root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-native.json",caseID]];
      BOOL selected = [kind isEqual:@"cancel"] || [kind isEqual:@"terminate"];
      if (selected && [binding[@"mediaId"] isEqual:control[@"mediaId"]]
          && [task.originalRequest.URL.absoluteString isEqual:expected]
          && totalBytesExpectedToSend == [binding[@"size"] longLongValue]
          && totalBytesSent > 0 && totalBytesSent < totalBytesExpectedToSend
          && task.countOfBytesSent > 0 && task.countOfBytesSent < totalBytesExpectedToSend
          && ![[NSFileManager defaultManager] fileExistsAtPath:eventPath]) {
        [task suspend];
        NSDictionary *event = @{@"kind":kind, @"mediaId":binding[@"mediaId"], @"uploadId":binding[@"uploadId"],
          @"atUnix":@([[NSDate date] timeIntervalSince1970]), @"callbackBytes":@(totalBytesSent),
          @"taskBytesAtSuspend":@(task.countOfBytesSent), @"expectedBytes":@(totalBytesExpectedToSend),
          @"taskStateAtSuspend":@(task.state)};
        NSData *eventBytes = [NSJSONSerialization dataWithJSONObject:event options:0 error:nil];
        BOOL saved = [eventBytes writeToFile:eventPath options:NSDataWritingWithoutOverwriting error:nil];
        if ([kind isEqual:@"cancel"] || !saved) [task cancel];
        // terminate remains suspended for operator SIGKILL; the ordinary 120s
        // transport timeout remains in force. Missing the window is NOT RUN.
      }
    }
  }
