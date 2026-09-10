# Original QuickSmith (VB6) reference notes

These are the commented-out Visual Basic fragments that travelled with `sch.js`
from the 1993 MS-DOS/Windows QuickSmith through the 2011 web port. They are the
authoritative record of how the original computed the ladder, the insertion
loss and the displayed results, and they were kept in the source as a
cross-check.

They are preserved here rather than in `sch.js` because the solver now lives in
`engine.js` and is cascaded as ABCD matrices, so the line-by-line
correspondence with the VB no longer holds. The numbers still do: every worked
example in `help/examples/examples/` is pinned in `tests/cases.js`.

Two known differences from the VB, both deliberate and both covered by tests:

- Insertion loss is referenced to `Z0`, not to `Re(Z_load)`.
- A transmission line is cascaded as a real two-port rather than reduced to a
  lumped series impedance, so its insertion loss is now correct.

---

```vb
// 'Neville-Aitken interpolation Algorithm
// 'xa and ya are global arrays, needs number of points not greater than 200 ad x Value to interpolate
// 'column number decides the coulmns 1 for first, 2 for second
// 'n is usually 4
// 'for proper interpolation phase values needs to be unwrapped, phase is unwrapped in Link_item_click()
// '
// Function interpolate(ByVal X As Double, ByVal n As Integer, ByVal column As Integer) As Double

// Static C(5), D(5)
// Dim I, m, ns As Integer
// Dim den, dif, dift, ho, hp, w, Y, dy As Double
// If (n > 10) Then GoTo endinter
// ns = 1
// xa(0) = 0
// 'x = 23
// dif = Abs(X - xa(1))    ' find the index ns closest to the entry
// For I = 1 To n Step 1
//  dift = Abs(X - xa(I))
//     If (dift < dif) Then
//         ns = I
//         dif = dift
//     End If
//  If (column = 1) Then
//  C(I) = y1a(I)
//  D(I) = y1a(I)
//  Else
//  C(I) = y2a(I)
//  D(I) = y2a(I)
//  End If
// Next I
//    If (column = 1) Then Y = y1a(ns) Else Y = y2a(ns)
   
//    ns = ns - 1
// For m = 1 To (n - 1) Step 1
//      For I = 1 To (n - m) Step 1
//        ho = xa(I) - X
//        hp = xa(I + m) - X
//        w = C(I + 1) - D(I)
//        den = ho - hp
//        If (den = 0) Then GoTo endinter
//        den = w / den
//        D(I) = hp * den
//        C(I) = ho * den
//        Next I
//    If (2 * ns < (n - m)) Then
//    dy = C(ns + 1)
//    Else
   
//    dy = D(ns)
//    ns = ns - 1
//    End If
//    Y = Y + dy
// Next m
// interpolate = Y
// Exit Function

// endinter:
//        Beep
//        MsgBox "Interpolation Error", 0, "QuickSmith"

// End Function

// If (MULTITER = 1) Then ' for mutilple termination interpolate Load

//     n = npoints ' tolal number of data available
//     X = freq ' locate index j closest to x use the xa Array for this
//     jl = 0      ' initialize lower and upper limits
//     ju = n + 1
//     While ((ju - jl) > 1) 'if we are not done yet
//         jm = (ju + jl) / 2    'compute mid point first
//         If (X > xatemp(jm)) Then jl = jm Else ju = jm
//     Wend
//     j = jl  ' returns index j such as j < x < J+1

//     ' get the leftmost index of a point m such that j is at the center
//     m = 4 ' number of sample points
//     k = min(max(j - (m - 1) / 2, 1), n + 1 - m) ' find midpoint offset
//     If m >= n Then
//         k = 1
//         m = n
//     End If
//     ' Assign Values for interpolating
//     For I = 1 To m Step 1
//         xa(I) = xatemp(k - 1 + I)
//         y1a(I) = y1atemp(k - 1 + I)
//         y2a(I) = y2atemp(k - 1 + I)
//     Next I
//     Ri = interpolate(X, m, 1)
//     Qi = interpolate(X, m, 2)

//     ZR(1) = GToZR(CSng(Ri), CSng(Qi))
//     ZI(1) = GToZI(CSng(Ri), CSng(Qi))
//     gammaM = Ri
//     GammaA = Qi
 // unwrap phase
    // Input #1, temp ' Z0
    // n = 0
    // prevphase = 0
    // offset = 0

    // Do While Not EOF(1)
         
    //      Input #1, Filedata0, Filedata1, Filedata2
    //         If (Filedata0 <> 0) Then
    //             n = n + 1
    //             If gmah = 1 Then Filedata0 = Filedata0 / 1000000#
    //             xatemp(n) = Filedata0   'freq
    //             y1atemp(n) = Filedata1 ' mag
    //             'y2atemp(n) = filedata2 ' phase
            
    //             ' code written to unwrap phase
    //             phase = Filedata2
    //             If (Abs(phase - prevphase) > 180) Then offset = offset - 360 * Sgn(phase - prevphase)
    //             prevphase = phase
    //             y2atemp(n) = phase + offset
    //         End If
    //         If (n > 1000) Then Exit Do
    // Loop
//Notes:
//var testjson = { name: "asd", tall: 123 };
//e.dataTransfer.setData("text/plain", JSON.stringify(testjson));
//e.dataTransfer.effectAllowed = "copy";
//in drop

//var data = e.dataTransfer.getData("text/plain");
//console.log(JSON.parse(data));
//and u will get

//Object {name: "asd", tall: 123 } 
//in console.log

//MZ! = Sqr(ZR(13) ^ 2 + ZI(13) ^ 2)           ' Zin
//AZ! = Atn(ZI(13) / ZR(13)) * 180 / Pi
//'If (MZ! = 50) Then AZ! = 0

//' Yin
//dx# = ZR(13) ^ 2 + ZI(13) ^ 2
//YRX! = ZR(13) * 1000 / dx#
//YIX! = -ZI(13) * 1000 / dx#
//MY! = Sqr(YRX! ^ 2 + YIX! ^ 2)
//If(YRX! = 0) Then YRX! = 0.000000000001
//AY! = Atn(YIX! / YRX!) * 180 / Pi
//sm! = ZToGammaM(CDbl(ZR(13)), CDbl(ZI(13)))                                     ' S11/Gamma
//SQ! = ZToGammaA(CDbl(ZR(13)), CDbl(ZI(13)))
//If(sm! = 0) Then SQ! = 0
//If(sm! = 0) Then sm! = 1E-36
//SR# = sm! * Cos(SQ! * Pi / 180)
//SI# = sm! * Sin(SQ! * Pi / 180)

//Swr! = (1 + sm!) / (1 - sm!)                    ' Swr
//RL = Abs(20 * (Log(sm!) / Log(10)))                ' Rl
//If(RL >= 720) Then st$ = ">" Else st$ = ""

//Call Ilcal(0)                                  ' S21

//msg$ = " ZIN : " & Format(ZR(13), "0.000") & " + " & Format(ZI(13), "0.000") & "j" & "   " &//
//    Format(MZ!, "0.000") & " < " & Format(AZ!, "0.000") & CRLF & "YIN(mS) : " &
//    Format(YRX!, "0.000") & " + " & Format(YIX!, "0.000") & "j" & "   " & Format(MY!, "0.000")
//    & " < " & Format(AY!, "0.000") & CRLF & "GAM : " & Format(SR#, "0.000") & " + " &
//    Format(SI#, "0.000") & "j" & "   " & Format(sm!, "0.000") & " < " & Format(SQ!, "0.000") &
//    CRLF & "S21 : " & Format(S21IM#, "0.000") & " dB" & " < " & Format(S21IA#, "0.000") & CRLF &
//    "VSWR : " & Format(Swr!, "0.000") & CRLF & "Return Loss : " & st$ & Format(RL, "0.000") & " dB" & CRLF & "Insertion Loss :
//" & Format(-S21IM#, "0.000") & " dB"
//msg1$ = "Reflection Loss : " & Format(-10 * Log(1 - sm! ^ 2) / Log(10), "0.000") & " dB" & CRLF &
//    "Power Reflection Coefficient : " & Format((sm! ^ 2), "0.000") & CRLF & "Transmission Loss Coefficient : "
//    & Format(((1 + (Swr!) ^ 2) / (2 * Swr!)), "0.000") & CRLF & "Maximum Standing Wave: " & Format(Sqr(Swr!), "0.000")
//    & CRLF & "Minimum Standing Wave: " & Format(1 / Sqr(Swr!), "0.000")
//'msg2$ = " Note: S21 vaild only if Z0 = Load "
```
