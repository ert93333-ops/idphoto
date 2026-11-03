export const specs = [
 {id:'kr-passport',ko:'대한민국 여권',en:'Korean passport',w:35,h:45,head:[32,36],white:true,passport:true,source:'https://www.passport.go.kr'},
 {id:'id-card',ko:'주민등록증',en:'Korean ID card',w:35,h:45,source:'https://www.gov.kr'},
 {id:'driver-license',ko:'운전면허증',en:'Korean driving licence',w:35,h:45,head:[32,36],white:true,source:'https://www.safedriving.or.kr/commonManage/selectCommonPhotoRulePop.do'},
 {id:'half-business',ko:'반명함',en:'Half-business portrait',w:30,h:40,convention:true,source:'./half-business/'},
 {id:'resume',ko:'이력서',en:'Résumé photo',w:30,h:40,convention:true,source:'./resume/'},
 {id:'us-passport',ko:'미국 여권 / 비자',en:'US passport / visa',w:50.8,h:50.8,head:[25.4,34.925],white:true,passport:true,source:'https://travel.state.gov/content/travel/en/passports/how-apply/photos.html'},
 {id:'japan-passport',ko:'일본 여권',en:'Japanese passport',w:35,h:45,head:[32,36],passport:true,source:'https://www.mofa.go.jp/mofaj/toko/passport/ic_photo.html'},
 {id:'china-visa',ko:'중국 비자',en:'Chinese visa',w:33,h:48,head:[28,33],white:true,source:'https://visaforchina.cn/SYD4_EN/qianzhengyewu/jichuzhishi/changjianwenti/552371235904950309.html'},
 {id:'schengen-visa',ko:'솅겐 비자',en:'Schengen visa',w:35,h:45,head:[32,36],source:'https://kuwait.diplo.de/resource/blob/2079290/153d98a9ab09f4702a0d796b5000a6f6/pdf-bio-photo-data.pdf'}
];
export const pixels = mm => Math.round(mm / 25.4 * 300);
