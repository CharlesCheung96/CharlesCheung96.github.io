# java匠人手法-优雅的处理空值


<!-- GFM-TOC -->

[TOC]

<!-- GFM-TOC -->

# java匠人手法-优雅的处理空值

# 导语

> 在笔者几年的开发经验中，经常看到项目中存在到处空值判断的情况，这些判断，会让人觉得摸不这头绪，它的出现很有可能和当前的业务逻辑并没有关系。但它会让你很头疼。
> 有时候，更可怕的是系统因为这些空值的情况，会抛出空指针异常，导致业务系统发生问题。
> 此篇文章，我总结了几种关于空值的处理手法，希望对读者有帮助。

# 业务中的空值

## 场景

存在一个UserSearchService用来提供用户查询的功能:

```java
public interface UserSearchService{
  List<User> listUser();

  User get(Integer id);
}
```

## 问题现场

对于面向对象语言来讲，抽象层级特别的重要。尤其是对接口的抽象，它在设计和开发中占很大的比重，我们在开发时希望尽量面向接口编程。
对于以上描述的接口方法来看，大概可以推断出可能它包含了以下两个含义:

1. listUser(): 查询用户列表
2. get(Integer id): 查询单个用户

在所有的开发中，XP推崇的TDD模式可以很好的引导我们对接口的定义，所以我们将TDD作为开发代码的”推动者”。
对于以上的接口，当我们使用TDD进行测试用例先行时，发现了潜在的问题：

1. listUser() 如果没有数据，那它是返回空集合还是null呢？
2. get(Integer id) 如果没有这个对象，是抛异常还是返回null呢？

### 深入listUser研究

我们先来讨论

```java
listUser()
```

这个接口，我经常看到如下实现:

```java
public List<User> listUser(){
    List<User> userList = userListRepostity.selectByExample(new UserExample());
    if(CollectionUtils.isEmpty(userList)){//spring util工具类
      return null;
    }
    return userList;
}
```

这段代码返回是null,从我多年的开发经验来讲，对于集合这样返回值，最好不要返回null，因为如果返回了null，会给调用者带来很多麻烦。你将会把这种调用风险交给调用者来控制。
如果调用者是一个谨慎的人，他会进行是否为null的条件判断。如果他并非谨慎，或者他是一个面向接口编程的狂热分子(当然，面向接口编程是正确的方向)，他会按照自己的理解去调用接口，而不进行是否为null的条件判断，如果这样的话，是非常危险的，它很有可能出现空指针异常！
根据墨菲定律来判断: “很有可能出现的问题，在将来一定会出现!”

基于此，我们将它进行优化:

```java
public List<User> listUser(){
    List<User> userList = userListRepostity.selectByExample(new UserExample());
    if(CollectionUtils.isEmpty(userList)){
      return Lists.newArrayList();//guava类库提供的方式
    }
    return userList;
}
```

对于接口(List listUser())，它一定会返回List，即使没有数据，它仍然会返回List（集合中没有任何元素）;
通过以上的修改，我们成功的避免了有可能发生的空指针异常，这样的写法更安全！

### 深入研究get方法

对于接口

```java
User get(Integer id)
```

你能看到的现象是，我给出id，它一定会给我返回User.但事实真的很有可能不是这样的。

我看到过的实现:

```java
public User get(Integer id){
  return userRepository.selectByPrimaryKey(id);//从数据库中通过id直接获取实体对象
}
```

相信很多人也都会这样写。
通过代码的时候得知它的返回值很有可能是null! 但我们通过的接口是分辨不出来的!
这个是个非常危险的事情。尤其对于调用者来说！

我给出的建议是，需要在接口明明时补充文档,比如对于异常的说明,使用注解@exception:

```java
public interface UserSearchService{

  /**
   * 根据用户id获取用户信息
   * @param id 用户id
   * @return 用户实体
   * @exception UserNotFoundException
   */
  User get(Integer id);

}
```

我们把接口定义加上了说明之后，调用者会看到，如果调用此接口，很有可能抛出“UserNotFoundException(找不到用户)”这样的异常。

这种方式可以在调用者调用接口的时候看到接口的定义，但是，这种方式是”弱提示”的！
如果调用者忽略了注释，有可能就对业务系统产生了风险，这个风险有可能导致一个亿！

除了以上这种”弱提示”的方式，还有一种方式是，返回值是有可能为空的。那要怎么办呢？
我认为我们需要增加一个接口，用来描述这种场景.
引入jdk8的Optional,或者使用guava的Optional.看如下定义:

```java
public interface UserSearchService{

  /**
   * 根据用户id获取用户信息
   * @param id 用户id
   * @return 用户实体,此实体有可能是缺省值
   */
  Optional<User> getOptional(Integer id);
}
```

Optional有两个含义: 存在 or 缺省。

那么通过阅读接口getOptional()，我们可以很快的了解返回值的意图，这个其实是我们想看到的，它去除了二义性。

它的实现可以写成:

```java
public Optional<User> getOptional(Integer id){  return Optional.ofNullable(userRepository.selectByPrimaryKey(id));}
```

### 深入入参

通过上述的所有接口的描述，你能确定入参id一定是必传的吗？ 我觉得答案应该是：不能确定。除非接口的文档注释上加以说明。

那如何约束入参呢?

我给大家推荐两种方式：

1. 强制约束
2. 文档性约束（弱提示）

1.强制约束，我们可以通过jsr 303进行严格的约束声明:

```java
public interface UserSearchService{  /**   * 根据用户id获取用户信息   * @param id 用户id   * @return 用户实体   * @exception UserNotFoundException   */  User get(@NotNull Integer id);  /**   * 根据用户id获取用户信息   * @param id 用户id   * @return 用户实体,此实体有可能是缺省值   */  Optional<User> getOptional(@NotNull Integer id);}
```

当然，这样写，要配合AOP的操作进行验证，但让spring已经提供了很好的集成方案，在此我就不在赘述了。

2.文档性约束

在很多时候，我们会遇到遗留代码，对于遗留代码，整体性改造的可能性很小。
我们更希望通过阅读接口的实现，来进行接口的说明。
jsr 305规范，给了我们一个描述接口入参的一个方式(需要引入库 com.google.code.findbugs:jsr305):

可以使用注解: @Nullable @Nonnull @CheckForNull 进行接口说明。
比如:

```java
public interface UserSearchService{  /**   * 根据用户id获取用户信息   * @param id 用户id   * @return 用户实体   * @exception UserNotFoundException   */  @CheckForNull  User get(@NonNull Integer id);  /**   * 根据用户id获取用户信息   * @param id 用户id   * @return 用户实体,此实体有可能是缺省值   */  Optional<User> getOptional(@NonNull Integer id);}
```

## 小结

通过 空集合返回值,Optional,jsr 303，jsr 305这几种方式，可以让我们的代码可读性更强，出错率更低！

1. 空集合返回值 ： 如果有集合这样返回值时，除非真的有说服自己的理由，否则，一定要返回空集合，而不是null
2. Optional: 如果你的代码是jdk8，就引入它！ 如果不是，则使用Guava的Optional,或者升级jdk版本！ 它很大程度的能增加了接口的可读性！
3. jsr 303: 如果新的项目正在开发，不防加上这个试试！ 一定有一种特别爽的感觉!
4. jsr 305: 如果老的项目在你的手上，你可以尝试的加上这种文档型注解，有助于你后期的重构，或者新功能增加了，对于老接口的理解!

# 空对象模式

## 场景

我们来看一个DTO转化的场景，对象:

```java
@Datastatic class PersonDTO{  private String dtoName;  private String dtoAge;}@Datastatic class Person{  private String name;  private String age;}
```

需求是将Person对象转化成PersonDTO，然后进行返回。
当然对于实际操作来讲，返回如果Person为空，将返回null,但是PersonDTO是不能返回null的（尤其Rest接口返回的这种DTO）。
在这里，我们只关注转化操作，看如下代码:

```java
@Testpublic void shouldConvertDTO(){  PersonDTO personDTO = new PersonDTO();  Person person = new Person();  if(!Objects.isNull(person)){    personDTO.setDtoAge(person.getAge());    personDTO.setDtoName(person.getName());  }else{    personDTO.setDtoAge("");    personDTO.setDtoName("");  }}
```

## 优化修改

这样的数据转化，我们认识可读性非常差，每个字段的判断，如果是空就设置为空字符串(“”)

换一种思维方式进行思考，我们是拿到Person这个类的数据，然后进行赋值操作(setXXX),其实是不关系Person的具体实现是谁的。

那我们可以创建一个Person子类:

```java
static class NullPerson extends Person{  @Override  public String getAge() {    return "";  }  @Override  public String getName() {    return "";  }}
```

它作为Person的一种特例而存在，如果当Person为空的时候，则返回一些get*的默认行为.

所以代码可以修改为:

```java
@Test public void shouldConvertDTO(){   PersonDTO personDTO = new PersonDTO();   Person person = getPerson();   personDTO.setDtoAge(person.getAge());   personDTO.setDtoName(person.getName()); } private Person getPerson(){   return new NullPerson();//如果Person是null ,则返回空对象 }
```

其中getPerson()方法，可以用来根据业务逻辑获取Person有可能的对象（对当前例子来讲，如果Person不存在，返回Person的的特例NUllPerson），如果修改成这样，代码的可读性就会变的很强了。

## 使用Optional可以进行优化

空对象模式，它的弊端在于需要创建一个特例对象，但是如果特例的情况比较多，我们是不是需要创建多个特例对象呢，虽然我们也使用了面向对象的多态特性，但是，业务的复杂性如果真的让我们创建多个特例对象，我们还是要再三考虑一下这种模式，它可能会带来代码的复杂性。

对于上述代码，还可以使用Optional进行优化。

```java
@Test  public void shouldConvertDTO(){    PersonDTO personDTO = new PersonDTO();    Optional.ofNullable(getPerson()).ifPresent(person -> {      personDTO.setDtoAge(person.getAge());      personDTO.setDtoName(person.getName());    });  }  private Person getPerson(){    return null;  }
```

Optional对空值的使用，我觉得更为贴切，它只适用于”是否存在”的场景。
如果只对控制的存在判断，我建议使用Optional.

# Optioanl的正确使用

Optional如此强大，它表达了计算机最原始的特性(0 or 1),那它如何正确的被使用呢!

## Optional不要作为参数

如果你写了一个public方法，这个方法规定了一些输入参数，这些参数中有一些是可以传入null的，那这时候是否可以使用Optional呢？

我给的建议是: 一定不要这样使用!

举个例子:

```java
public interface UserService{  List<User> listUser(Optional<String> username);}
```

这个例子的方法 listUser,可能在告诉我们需要根据username查询所有数据集合，如果username是空，也要返回所有的用户集合.

当我们看到这个方法的时候，会觉得有一些歧义:

“如果username是absent,是返回空集合吗？还是返回全部的用户数据集合？”

Optioanl是一种分支的判断，那我们究竟是关注 Optional还是Optional.get()呢？

我给大家的建议是，如果不想要这样的歧义，就不要使用它！

如果你真的想表达两个含义，就給它拆分出两个接口:

```java
public interface UserService{  List<User> listUser(String username);  List<User> listUser();}
```

我觉得这样的语义更强，并且更能满足 软件设计原则中的 “单一职责”。

如果你觉得你的入参真的有必要可能传null,那请使用jsr 303或者jsr 305进行说明和验证!

请记住! Optional不能作为入参的参数!

## Optional作为返回值

### 当个实体的返回

那Optioanl可以做为返回值吗？
其实它是非常满足是否存在这个语义的。

你如说，你要根据id获取用户信息，这个用户有可能存在或者不存在。

你可以这样使用:

```java
public interface UserService{  Optional<User> get(Integer id);}
```

当调用这个方法的时候，调用者很清楚get方法返回的数据，有可能不存在，这样可以做一些更合理的判断，更好的防止空指针的错误！

当然，如果业务方真的需要根据id必须查询出User的话，就不要这样使用了，请说明，你要抛出的异常.

只有当考虑它返回null是合理的情况下，才进行Optional的返回

### 集合实体的返回

不是所有的返回值都可以这样用的！ 如果你返回的是集合：

```java
public interface UserService{  Optional<List<User>> listUser();}
```

这样的返回结果，会让调用者不知所措，是否我判断Optional之后，还用进行isEmpty的判断呢？

这样带来的返回值歧义！ 我认为是没有必要的。

我们要约定，对于List这种集合返回值，如果集合真的是null的，请返回空集合(Lists.newArrayList);

## 使用Optional变量

```java
Optional<User> userOpt = ...
```

如果有这样的变量userOpt,请记住 ：

1. 一定不能直接使用get ，如果这样用，就丧失了Optional本身的含义 （ 比如userOp.get() ）
2. 不要直接使用getOrThrow ,如果你有这样的需求：获取不到就抛异常。 那就要考虑，是否是调用的接口设计的是否合理

## getter中的使用

对于一个java bean,所有的属性都有可能返回null,那是否需要改写所有的getter成为Optional类型呢？

我给大家的建议是，不要这样滥用Optional.

即便 我java bean中的getter是符合Optional的，但是因为java bean 太多了，这样会导致你的代码有50%以上进行Optinal的判断，这样便污染了代码。(我想说，其实你的实体中的字段应该都是由业务含义的，会认真的思考过它存在的价值的，不能因为Optional的存在而滥用)

我们应该更关注于业务，而不只是空值的判断。

请不要在getter中滥用Optional.

## 小结

可以这样总结Optional的使用：

1. 当使用值为空的情况，并非源于错误时，可以使用Optional!
2. Optional不要用于集合操作!
3. 不要滥用Optional,比如在java bean的getter中!

