#!/usr/bin/env python3
"""Compile the exact delegate snippets against a fake task. No network/device I/O."""
import subprocess
import tempfile
from pathlib import Path

here = Path(__file__).resolve().parent
flag = '[[NSBundle mainBundle] objectForInfoDictionaryKey:@"Task05ValidationBuild"]'
root = 'NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES).firstObject'
progress = (here / 'delegate.m.inc').read_text().replace(flag, 'enabled').replace(root, 'testRoot')
completion = (here / 'completion.m.inc').read_text().replace(flag, 'enabled').replace(root, 'testRoot')
source = r'''
#import <Foundation/Foundation.h>
@interface MockTask : NSObject
@property NSURLRequest *originalRequest;
@property int64_t countOfBytesSent;
@property int64_t countOfBytesExpectedToSend;
@property NSInteger state;
@property NSInteger suspensions;
@property NSInteger cancellations;
- (void)suspend;
- (void)cancel;
@end
@implementation MockTask
- (void)suspend { self.suspensions++; self.state=1; }
- (void)cancel { self.cancellations++; self.state=2; }
@end
static void progress(MockTask *task, int64_t totalBytesSent, int64_t totalBytesExpectedToSend, BOOL enabled, NSString *testRoot) {
__PROGRESS__
}
static void complete(MockTask *task, NSError *error, BOOL enabled, NSString *testRoot) {
__COMPLETION__
}
static void save(NSString *path, id object) {
  BOOL ok=[[NSJSONSerialization dataWithJSONObject:object options:0 error:nil] writeToFile:path atomically:YES];
  NSCAssert(ok,@"fixture write");
}
int main() { @autoreleasepool {
  NSString *root=[NSTemporaryDirectory() stringByAppendingPathComponent:NSUUID.UUID.UUIDString];
  [[NSFileManager defaultManager] createDirectoryAtPath:root withIntermediateDirectories:YES attributes:nil error:nil];
  NSArray *cases=@[@"disabled",@"unrelated",@"zero",@"full-callback",@"full-task",@"wrong-size",@"release",@"cancel",@"terminate"];
  for (NSString *test in cases) {
    NSString *caseID=NSUUID.UUID.UUIDString;
    NSString *event=[root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-native.json",caseID]];
    NSString *binding=[root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-binding.json",caseID]];
    NSString *kind=[test isEqual:@"terminate"]?@"terminate":@"cancel";
    save([root stringByAppendingPathComponent:@"task05-control.json"],@{@"caseId":caseID,@"action":[test isEqual:@"release"]?@"release":@"arm",@"mediaId":@"new-id"});
    save(binding,@{@"mediaId":@"new-id",@"kind":kind,@"organizationId":@"org",@"uploadId":@"session",@"size":@4096});
    MockTask *task=[MockTask new];
    task.originalRequest=[NSURLRequest requestWithURL:[NSURL URLWithString:[test isEqual:@"unrelated"]?@"https://other.example/content":@"https://handovertrack.com/media/organizations/org/uploads/session/content"]];
    task.countOfBytesSent=[test isEqual:@"full-task"]?4096:512;
    task.countOfBytesExpectedToSend=4096;
    int64_t sent=[test isEqual:@"zero"]?0:([test isEqual:@"full-callback"]?4096:512);
    int64_t expected=[test isEqual:@"wrong-size"]?8192:4096;
    BOOL selected=[test isEqual:@"cancel"]||[test isEqual:@"terminate"];
    progress(task,sent,expected,![test isEqual:@"disabled"],root);
    NSCAssert(task.suspensions==(selected?1:0),@"wrong suspend decision: %@",test);
    NSCAssert(task.cancellations==([test isEqual:@"cancel"]?1:0),@"wrong cancel decision: %@",test);
    NSCAssert([[NSFileManager defaultManager] fileExistsAtPath:event]==selected,@"wrong evidence decision: %@",test);
    if (selected) {
      NSData *before=[NSData dataWithContentsOfFile:event];
      progress(task,1024,4096,YES,root);
      NSCAssert(task.suspensions==1 && [before isEqual:[NSData dataWithContentsOfFile:event]],@"case fired twice");
      complete(task,[NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCancelled userInfo:nil],YES,root);
      NSString *finished=[root stringByAppendingPathComponent:[NSString stringWithFormat:@"task05-%@-native-finished.json",caseID]];
      NSDictionary *out=[NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:finished] options:0 error:nil];
      NSCAssert([out[@"finalTaskBytesSent"] longLongValue]==512 && [out[@"errorCode"] integerValue]==NSURLErrorCancelled,@"final counters absent");
    }
    printf("PASS synthetic native delegate: %s\n",test.UTF8String);
  }
  // Only our freshly generated temporary harness fixtures are removed.
  [[NSFileManager defaultManager] removeItemAtPath:root error:nil];
} return 0; }
'''.replace('__PROGRESS__', progress).replace('__COMPLETION__', completion)
with tempfile.TemporaryDirectory(prefix='task05-native-harness-') as directory:
    path = Path(directory)
    (path / 'harness.m').write_text(source)
    subprocess.run(['xcrun', 'clang', '-fobjc-arc', '-Wno-incompatible-pointer-types', '-framework', 'Foundation', str(path / 'harness.m'), '-o', str(path / 'harness')], check=True)
    subprocess.run([str(path / 'harness')], check=True)
