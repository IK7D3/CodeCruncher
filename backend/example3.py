def kmm(x, y):
    if (x < y):
        temp = x
        x = y
        y = temp

    while (y != 0):
        remainder = x % y
        x = y
        y = remainder
    r = x
    return r
a,b =map(int,input().split())    
l = int((a * b) / kmm(a, b))
bmm = (a*b)/l

print(str("%.0f"%bmm)+" "+str(l))