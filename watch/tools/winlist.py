import ctypes, ctypes.util
cf = ctypes.cdll.LoadLibrary(ctypes.util.find_library('CoreFoundation'))
cg = ctypes.cdll.LoadLibrary(ctypes.util.find_library('CoreGraphics'))
cf.CFStringCreateWithCString.restype = ctypes.c_void_p
cf.CFStringCreateWithCString.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_uint32]
cf.CFArrayGetCount.restype=ctypes.c_long; cf.CFArrayGetCount.argtypes=[ctypes.c_void_p]
cf.CFArrayGetValueAtIndex.restype=ctypes.c_void_p; cf.CFArrayGetValueAtIndex.argtypes=[ctypes.c_void_p,ctypes.c_long]
cf.CFDictionaryGetValue.restype=ctypes.c_void_p; cf.CFDictionaryGetValue.argtypes=[ctypes.c_void_p,ctypes.c_void_p]
cf.CFStringGetCString.restype=ctypes.c_bool; cf.CFStringGetCString.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_long,ctypes.c_uint32]
cf.CFNumberGetValue.restype=ctypes.c_bool; cf.CFNumberGetValue.argtypes=[ctypes.c_void_p,ctypes.c_long,ctypes.c_void_p]
cg.CGWindowListCopyWindowInfo.restype=ctypes.c_void_p; cg.CGWindowListCopyWindowInfo.argtypes=[ctypes.c_uint32,ctypes.c_uint32]
def s(x): return cf.CFStringCreateWithCString(None, x.encode(), 0x08000100)
def getstr(d,k):
    v=cf.CFDictionaryGetValue(d,s(k))
    if not v: return ''
    b=ctypes.create_string_buffer(512)
    return b.value.decode() if cf.CFStringGetCString(v,b,512,0x08000100) else ''
def getnum(d,k):
    v=cf.CFDictionaryGetValue(d,s(k))
    if not v: return None
    out=ctypes.c_double()
    cf.CFNumberGetValue(v,13,ctypes.byref(out))
    return out.value
arr=cg.CGWindowListCopyWindowInfo(1|16, 0)  # OnScreenOnly|ExcludeDesktopElements
for i in range(cf.CFArrayGetCount(arr)):
    d=cf.CFArrayGetValueAtIndex(arr,i)
    owner=getstr(d,'kCGWindowOwnerName'); name=getstr(d,'kCGWindowName')
    if 'imulat' in owner.lower() or 'connectiq' in owner.lower().replace(' ',''):
        b=cf.CFDictionaryGetValue(d,s('kCGWindowBounds'))
        print('OWNER=%r NAME=%r WID=%s' % (owner,name,getnum(d,'kCGWindowNumber')),
              'X=%s Y=%s W=%s H=%s'%(getnum(b,'X'),getnum(b,'Y'),getnum(b,'Width'),getnum(b,'Height')))
