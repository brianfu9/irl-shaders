# irl-shaders
apply colorblind fixing filters in augmented reality

## a blog:
The original idea for this project was supposed to be easy. 
1. get a video stream from the device 
2. chop out the red wavelengths and add them back in blue and green
3. display the output frames

What I failed to consider was:
1. all of the various color spaces and their transform matrices
    - sRGB, XYZ, LMS
2. colorblind correction (daltonization) is a subjective algorithm. If you are trying to replace red light, you need to artistically come up its replacement. 
    - this algorithm is incorrectly (imperfectly) implemented in like half of online sources. 
3. 720p 60fps RGB is `1280×720 × 60 × 3 = 165,888,000` channels to process per second. kind of a lot for a browser. 
    - i guess it does reduce to `O(n)` which is why this is possible at all

I also wanted to try out a git submodule architecture to fit this project into my github pages [brianfu.me](https://brianfu.me/#shaders) but you still need to create commits in the parent repository when the submodule changes. 