def count(n,s):
    global t
    global l_i
    global l_o
    l_i = s.count('I')
    l_o = s.count('O')
    if l_i > n or l_o >n or l_o > l_i:
        return 0
    if len(s) == 2*n:
        t= t+1
        return 1

    count(n, s+'I')
    count(n, s+'O')


l_i = 0
l_o = 0
t = 0
n = int(input())
s = input()
count(n,s)
print(t)